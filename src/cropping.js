export class CropManager {
    constructor(ui) {
        this.ui = ui;
        this.MIN_SELECTION_PX = 80;

        this.state = {
            selection: null,
            display: { width: 0, height: 0 },
            mode: null,
            activeHandle: null,
            startPointer: null,
            startPointerNorm: null,
            initialSelection: null,
            activePointerId: null
        };

        this.boundHandleResize = this.handleResize.bind(this);
        this.boundPointerUp = this.onPointerUp.bind(this);
        this.resizeFrame = null;
        this.globalPointerListenersAttached = false;
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            this.ui.isSelectingFile = false;
            return;
        }

        this.ui.winMessage.classList.add('hidden');

        const reader = new FileReader();
        reader.onload = (e) => {
            this.ui.originalImage = new Image();
            this.ui.originalImage.onload = () => {
                this.ui.isSelectingFile = false;
                this.showCropModal();
            };
            this.ui.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    loadNewImage() {
        if (this.ui.isSelectingFile) {
            return;
        }
        this.ui.isSelectingFile = true;
        this.ui.imageInput.click();
    }

    showCropModal() {
        if (!this.ui.originalImage) return;

        this.ui.cropModal.classList.remove('hidden');
        this.resetPointerState();
        this.detachResizeListener();

        requestAnimationFrame(() => {
            this.layoutCropSurface({ resetSelection: true });
            window.addEventListener('resize', this.boundHandleResize);
        });
    }

    layoutCropSurface({ resetSelection = false } = {}) {
        if (!this.ui.originalImage) {
            return;
        }

        const display = this.calculateDisplayDimensions();
        this.state.display = display;

        const { cropCanvas, cropCtx, cropOverlay, cropContainer } = this.ui;
        cropCanvas.width = display.width;
        cropCanvas.height = display.height;
        cropCanvas.style.width = `${display.width}px`;
        cropCanvas.style.height = `${display.height}px`;

        cropOverlay.style.width = `${display.width}px`;
        cropOverlay.style.height = `${display.height}px`;

        if (cropContainer) {
            cropContainer.style.width = `${display.width}px`;
            cropContainer.style.height = `${display.height}px`;
        }

        cropCtx.clearRect(0, 0, display.width, display.height);
        cropCtx.drawImage(this.ui.originalImage, 0, 0, display.width, display.height);

        if (resetSelection || !this.state.selection) {
            this.state.selection = this.getDefaultSelection();
        }

        this.applySelection();
    }

    calculateDisplayDimensions() {
        const image = this.ui.originalImage;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || image.width;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || image.height;

        const parse = (value) => Number.parseFloat(value) || 0;

        const content = this.ui.cropModalContent;
        const header = this.ui.cropHeader;
        const actions = this.ui.cropActions;
        const container = this.ui.cropContainer;

        const contentStyles = content ? window.getComputedStyle(content) : null;
        const paddingX = contentStyles ? parse(contentStyles.paddingLeft) + parse(contentStyles.paddingRight) : 0;
        const paddingY = contentStyles ? parse(contentStyles.paddingTop) + parse(contentStyles.paddingBottom) : 0;

        const headerStyles = header ? window.getComputedStyle(header) : null;
        const headerHeight = header ? header.offsetHeight + parse(headerStyles.marginTop) + parse(headerStyles.marginBottom) : 0;

        const actionsStyles = actions ? window.getComputedStyle(actions) : null;
        const actionsHeight = actions ? actions.offsetHeight + parse(actionsStyles.marginTop) + parse(actionsStyles.marginBottom) : 0;

        const containerStyles = container ? window.getComputedStyle(container) : null;
        const containerMarginY = containerStyles ? parse(containerStyles.marginTop) + parse(containerStyles.marginBottom) : 0;

        const widthCandidates = [
            viewportWidth * 0.9 - paddingX,
            (content ? content.clientWidth : viewportWidth) - paddingX,
            viewportWidth - 80
        ].filter((value) => Number.isFinite(value) && value > 0);

        const computedMaxWidth = widthCandidates.length ? Math.min(...widthCandidates) : image.width;
        const maxWidth = Math.max(160, Math.min(computedMaxWidth, viewportWidth - 40));

        const heightCandidates = [
            viewportHeight * 0.9 - paddingY - headerHeight - actionsHeight - containerMarginY,
            viewportHeight - (headerHeight + actionsHeight + containerMarginY + 120),
            viewportHeight * 0.85
        ].filter((value) => Number.isFinite(value) && value > 0);

        const computedMaxHeight = heightCandidates.length ? Math.min(...heightCandidates) : image.height;
        const maxHeight = Math.max(160, Math.min(computedMaxHeight, viewportHeight - 120));

        const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);

        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        return { width, height };
    }

    getDefaultSelection(anchor = null) {
        const { width, height } = this.state.display;
        if (!width || !height) {
            return { x: 0, y: 0, width: 1, height: 1 };
        }

        const targetSize = Math.min(width, height) * 0.8;
        const normWidth = Math.min(1, targetSize / width);
        const normHeight = Math.min(1, targetSize / height);

        let x = anchor ? anchor.x - normWidth / 2 : (1 - normWidth) / 2;
        let y = anchor ? anchor.y - normHeight / 2 : (1 - normHeight) / 2;

        x = this.clampValue(x, 0, 1 - normWidth);
        y = this.clampValue(y, 0, 1 - normHeight);

        const selection = { x, y, width: normWidth, height: normHeight };
        this.clampSelection(selection);
        return selection;
    }

    getMinSelectionNormalized() {
        const { width, height } = this.state.display;
        if (!width || !height) {
            return { width: 0, height: 0 };
        }

        const minWidth = Math.min(1, this.MIN_SELECTION_PX / width);
        const minHeight = Math.min(1, this.MIN_SELECTION_PX / height);
        return { width: minWidth, height: minHeight };
    }

    applySelection() {
        const selection = this.state.selection;
        const { width, height } = this.state.display;
        if (!selection || !width || !height) {
            return;
        }

        this.clampSelection(selection);

        const left = selection.x * width;
        const top = selection.y * height;
        const selectionWidth = selection.width * width;
        const selectionHeight = selection.height * height;

        const selectionEl = this.ui.cropSelection;
        selectionEl.style.left = `${left}px`;
        selectionEl.style.top = `${top}px`;
        selectionEl.style.width = `${selectionWidth}px`;
        selectionEl.style.height = `${selectionHeight}px`;
    }

    clampSelection(selection) {
        const { width, height } = this.state.display;
        if (!width || !height || !selection) {
            return;
        }

        const min = this.getMinSelectionNormalized();
        selection.width = this.clampValue(selection.width, min.width, 1);
        selection.height = this.clampValue(selection.height, min.height, 1);
        selection.x = this.clampValue(selection.x, 0, 1 - selection.width);
        selection.y = this.clampValue(selection.y, 0, 1 - selection.height);
    }

    clampValue(value, min, max) {
        if (Number.isNaN(value)) return min;
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    getPointerPosition(event) {
        const rect = this.ui.cropOverlay.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return {
            x: this.clampValue(x, 0, rect.width),
            y: this.clampValue(y, 0, rect.height)
        };
    }

    toNormalized(position) {
        const { width, height } = this.state.display;
        if (!width || !height) {
            return { x: 0, y: 0 };
        }
        return {
            x: position.x / width,
            y: position.y / height
        };
    }

    getSelectionPixels() {
        const selection = this.state.selection;
        const { width, height } = this.state.display;
        if (!selection || !width || !height) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        return {
            x: selection.x * width,
            y: selection.y * height,
            width: selection.width * width,
            height: selection.height * height
        };
    }

    getHandleAtPosition(pointer) {
        const selection = this.getSelectionPixels();
        if (selection.width === 0 || selection.height === 0) {
            return null;
        }

        const tolerance = 18;
        const left = selection.x;
        const right = selection.x + selection.width;
        const top = selection.y;
        const bottom = selection.y + selection.height;
        const centerX = left + selection.width / 2;
        const centerY = top + selection.height / 2;

        const nearLeft = Math.abs(pointer.x - left) <= tolerance;
        const nearRight = Math.abs(pointer.x - right) <= tolerance;
        const nearTop = Math.abs(pointer.y - top) <= tolerance;
        const nearBottom = Math.abs(pointer.y - bottom) <= tolerance;

        if (nearLeft && nearTop) return 'nw';
        if (nearRight && nearTop) return 'ne';
        if (nearLeft && nearBottom) return 'sw';
        if (nearRight && nearBottom) return 'se';

        if (nearTop && pointer.x >= left && pointer.x <= right) return 'n';
        if (nearBottom && pointer.x >= left && pointer.x <= right) return 's';
        if (nearLeft && pointer.y >= top && pointer.y <= bottom) return 'w';
        if (nearRight && pointer.y >= top && pointer.y <= bottom) return 'e';

        const handleSize = 20;
        const insideHandle = (cx, cy) =>
            Math.abs(pointer.x - cx) <= handleSize && Math.abs(pointer.y - cy) <= handleSize;

        if (insideHandle(centerX, top)) return 'n';
        if (insideHandle(centerX, bottom)) return 's';
        if (insideHandle(left, centerY)) return 'w';
        if (insideHandle(right, centerY)) return 'e';

        return null;
    }

    isInsideSelection(pointer) {
        const selection = this.getSelectionPixels();
        if (selection.width === 0 || selection.height === 0) {
            return false;
        }

        return pointer.x >= selection.x && pointer.x <= selection.x + selection.width &&
            pointer.y >= selection.y && pointer.y <= selection.y + selection.height;
    }

    onPointerDown(event) {
        if (event.button !== undefined && event.button !== 0) {
            return;
        }

        event.preventDefault();

        const pointer = this.getPointerPosition(event);
        const pointerNorm = this.toNormalized(pointer);

        this.state.startPointer = pointer;
        this.state.startPointerNorm = pointerNorm;
        this.state.initialSelection = this.state.selection ? { ...this.state.selection } : null;
        this.state.activePointerId = event.pointerId;

        const handle = this.getHandleAtPosition(pointer);
        if (handle) {
            this.state.mode = 'resize';
            this.state.activeHandle = handle;
        } else if (this.isInsideSelection(pointer)) {
            this.state.mode = 'move';
            this.state.activeHandle = null;
        } else {
            this.state.mode = 'new';
            this.state.activeHandle = null;
            this.state.selection = {
                x: pointerNorm.x,
                y: pointerNorm.y,
                width: 0,
                height: 0
            };
        }

        if (typeof this.ui.cropOverlay.setPointerCapture === 'function') {
            try {
                this.ui.cropOverlay.setPointerCapture(event.pointerId);
            } catch (error) {
                // Ignore if pointer capture fails
            }
        }

        this.attachGlobalPointerListeners();
        this.applySelection();
    }

    onPointerMove(event) {
        if (!this.state.mode) {
            return;
        }

        event.preventDefault();

        const pointer = this.getPointerPosition(event);
        const pointerNorm = this.toNormalized(pointer);

        switch (this.state.mode) {
            case 'move':
                this.handleMove(pointerNorm);
                break;
            case 'resize':
                this.handleResizeDrag(pointerNorm);
                break;
            case 'new':
                this.handleNewSelection(pointerNorm);
                break;
        }

        this.applySelection();
    }

    handleMove(pointerNorm) {
        if (!this.state.initialSelection || !this.state.startPointerNorm) {
            return;
        }

        const deltaX = pointerNorm.x - this.state.startPointerNorm.x;
        const deltaY = pointerNorm.y - this.state.startPointerNorm.y;

        this.state.selection = {
            x: this.state.initialSelection.x + deltaX,
            y: this.state.initialSelection.y + deltaY,
            width: this.state.initialSelection.width,
            height: this.state.initialSelection.height
        };
    }

    handleResizeDrag(pointerNorm) {
        if (!this.state.initialSelection) {
            return;
        }

        const initial = this.state.initialSelection;
        const min = this.getMinSelectionNormalized();
        const startRight = initial.x + initial.width;
        const startBottom = initial.y + initial.height;

        let selection = { ...initial };

        const clamp = (value, minValue, maxValue) => this.clampValue(value, minValue, maxValue);

        switch (this.state.activeHandle) {
            case 'nw': {
                const newX = clamp(pointerNorm.x, 0, startRight - min.width);
                const newY = clamp(pointerNorm.y, 0, startBottom - min.height);
                selection.x = newX;
                selection.y = newY;
                selection.width = startRight - newX;
                selection.height = startBottom - newY;
                break;
            }
            case 'ne': {
                const newRight = clamp(pointerNorm.x, initial.x + min.width, 1);
                const newY = clamp(pointerNorm.y, 0, startBottom - min.height);
                selection.width = newRight - initial.x;
                selection.y = newY;
                selection.height = startBottom - newY;
                break;
            }
            case 'sw': {
                const newX = clamp(pointerNorm.x, 0, startRight - min.width);
                const newBottom = clamp(pointerNorm.y, initial.y + min.height, 1);
                selection.x = newX;
                selection.width = startRight - newX;
                selection.height = newBottom - initial.y;
                break;
            }
            case 'se': {
                const newRight = clamp(pointerNorm.x, initial.x + min.width, 1);
                const newBottom = clamp(pointerNorm.y, initial.y + min.height, 1);
                selection.width = newRight - initial.x;
                selection.height = newBottom - initial.y;
                break;
            }
            case 'n': {
                const newY = clamp(pointerNorm.y, 0, startBottom - min.height);
                selection.y = newY;
                selection.height = startBottom - newY;
                break;
            }
            case 's': {
                const newBottom = clamp(pointerNorm.y, initial.y + min.height, 1);
                selection.height = newBottom - initial.y;
                break;
            }
            case 'w': {
                const newX = clamp(pointerNorm.x, 0, startRight - min.width);
                selection.x = newX;
                selection.width = startRight - newX;
                break;
            }
            case 'e': {
                const newRight = clamp(pointerNorm.x, initial.x + min.width, 1);
                selection.width = newRight - initial.x;
                break;
            }
            default:
                break;
        }

        this.state.selection = selection;
    }

    handleNewSelection(pointerNorm) {
        if (!this.state.startPointerNorm) {
            return;
        }

        const start = this.state.startPointerNorm;
        const min = this.getMinSelectionNormalized();

        let x = Math.min(start.x, pointerNorm.x);
        let y = Math.min(start.y, pointerNorm.y);
        let width = Math.abs(pointerNorm.x - start.x);
        let height = Math.abs(pointerNorm.y - start.y);

        if (width < min.width) {
            width = min.width;
            if (pointerNorm.x < start.x) {
                x = start.x - width;
            }
        }

        if (height < min.height) {
            height = min.height;
            if (pointerNorm.y < start.y) {
                y = start.y - height;
            }
        }

        this.state.selection = { x, y, width, height };
    }

    onPointerUp(event) {
        if (!this.state.mode) {
            return;
        }

        if (event) {
            try {
                if (typeof this.ui.cropOverlay.releasePointerCapture === 'function' &&
                    this.ui.cropOverlay.hasPointerCapture &&
                    this.ui.cropOverlay.hasPointerCapture(event.pointerId)) {
                    this.ui.cropOverlay.releasePointerCapture(event.pointerId);
                }
            } catch (error) {
                // Ignore release errors
            }
        }

        this.applySelection();
        this.resetPointerState();
    }

    resetPointerState() {
        this.state.mode = null;
        this.state.activeHandle = null;
        this.state.startPointer = null;
        this.state.startPointerNorm = null;
        this.state.initialSelection = null;
        this.state.activePointerId = null;
        this.detachGlobalPointerListeners();
    }

    attachGlobalPointerListeners() {
        if (this.globalPointerListenersAttached) {
            return;
        }
        window.addEventListener('pointerup', this.boundPointerUp);
        window.addEventListener('pointercancel', this.boundPointerUp);
        this.globalPointerListenersAttached = true;
    }

    detachGlobalPointerListeners() {
        if (!this.globalPointerListenersAttached) {
            return;
        }
        window.removeEventListener('pointerup', this.boundPointerUp);
        window.removeEventListener('pointercancel', this.boundPointerUp);
        this.globalPointerListenersAttached = false;
    }

    handleResize() {
        if (this.ui.cropModal.classList.contains('hidden') || !this.ui.originalImage) {
            return;
        }

        if (this.resizeFrame) {
            cancelAnimationFrame(this.resizeFrame);
        }

        this.resizeFrame = requestAnimationFrame(() => {
            this.resizeFrame = null;
            this.layoutCropSurface({ resetSelection: false });
        });
    }

    detachResizeListener() {
        if (this.resizeFrame) {
            cancelAnimationFrame(this.resizeFrame);
            this.resizeFrame = null;
        }
        window.removeEventListener('resize', this.boundHandleResize);
    }

    confirmCrop() {
        if (!this.ui.originalImage || !this.state.selection) return;

        this.detachResizeListener();
        this.resetPointerState();

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        const { selection } = this.state;
        const sourceX = selection.x * this.ui.originalImage.width;
        const sourceY = selection.y * this.ui.originalImage.height;
        const sourceWidth = selection.width * this.ui.originalImage.width;
        const sourceHeight = selection.height * this.ui.originalImage.height;

        const size = Math.min(sourceWidth, sourceHeight);
        tempCanvas.width = 400;
        tempCanvas.height = 400;

        tempCtx.drawImage(
            this.ui.originalImage,
            sourceX, sourceY, size, size,
            0, 0, 400, 400
        );

        this.ui.image = new Image();
        this.ui.image.onload = () => {
            this.ui.cropModal.classList.add('hidden');
            if (this.ui.onImageSelected) {
                this.ui.onImageSelected(this.ui.image);
            }
        };
        this.ui.image.src = tempCanvas.toDataURL();
    }

    cancelCrop() {
        this.ui.cropModal.classList.add('hidden');
        this.ui.imageInput.value = '';
        this.ui.isSelectingFile = false;
        this.ui.clearShuffleTimer();
        this.detachResizeListener();
        this.resetPointerState();
    }

    handleResize() {
        if (this.ui.cropModal.classList.contains('hidden') || !this.ui.originalImage) {
            return;
        }

        this.state.isDragging = false;
        this.state.isResizing = false;
        this.state.dragHandle = null;

        if (this.resizeFrame) {
            cancelAnimationFrame(this.resizeFrame);
        }

        this.resizeFrame = requestAnimationFrame(() => {
            this.resizeFrame = null;
            this.setupCropCanvas({ preserveSelection: true });
        });
    }

    detachResizeListener() {
        if (this.resizeFrame) {
            cancelAnimationFrame(this.resizeFrame);
            this.resizeFrame = null;
        }
        window.removeEventListener('resize', this.boundHandleResize);
    }
}
