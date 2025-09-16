export class CropManager {
    constructor(ui) {
        this.ui = ui;
        this.state = {
            isDragging: false,
            isResizing: false,
            dragHandle: null,
            startX: 0,
            startY: 0,
            startCropX: 0,
            startCropY: 0,
            startCropWidth: 0,
            startCropHeight: 0,
            cropX: 50,
            cropY: 50,
            cropWidth: 200,
            cropHeight: 200,
            canvasScale: 1
        };
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
        this.setupCropCanvas();
        this.initializeCropSelection();
    }

    setupCropCanvas() {
        const maxWidth = 600;
        const maxHeight = 400;
        let displayWidth = this.ui.originalImage.width;
        let displayHeight = this.ui.originalImage.height;

        const scale = Math.min(maxWidth / displayWidth, maxHeight / displayHeight, 1);
        displayWidth *= scale;
        displayHeight *= scale;

        this.ui.cropCanvas.width = displayWidth;
        this.ui.cropCanvas.height = displayHeight;
        this.state.canvasScale = displayWidth / this.ui.originalImage.width;

        this.ui.cropCtx.clearRect(0, 0, displayWidth, displayHeight);
        this.ui.cropCtx.drawImage(this.ui.originalImage, 0, 0, displayWidth, displayHeight);

        this.ui.cropOverlay.style.width = `${displayWidth}px`;
        this.ui.cropOverlay.style.height = `${displayHeight}px`;
    }

    initializeCropSelection() {
        const canvasWidth = this.ui.cropCanvas.width;
        const canvasHeight = this.ui.cropCanvas.height;
        const isMobile = window.innerWidth <= 768;
        const sizeRatio = isMobile ? 0.7 : 0.6;
        const size = Math.min(canvasWidth, canvasHeight) * sizeRatio;

        this.state.cropWidth = size;
        this.state.cropHeight = size;
        this.state.cropX = Math.max(0, (canvasWidth - size) / 2);
        this.state.cropY = Math.max(0, (canvasHeight - size) / 2);

        if (this.state.cropX + this.state.cropWidth > canvasWidth) {
            this.state.cropX = canvasWidth - this.state.cropWidth;
        }
        if (this.state.cropY + this.state.cropHeight > canvasHeight) {
            this.state.cropY = canvasHeight - this.state.cropHeight;
        }

        this.updateCropSelection();
    }

    updateCropSelection() {
        const { cropX, cropY, cropWidth, cropHeight } = this.state;
        this.ui.cropSelection.style.left = `${cropX}px`;
        this.ui.cropSelection.style.top = `${cropY}px`;
        this.ui.cropSelection.style.width = `${cropWidth}px`;
        this.ui.cropSelection.style.height = `${cropHeight}px`;
    }

    confirmCrop() {
        if (!this.ui.originalImage) return;

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        const scale = 1 / this.state.canvasScale;
        const actualX = this.state.cropX * scale;
        const actualY = this.state.cropY * scale;
        const actualWidth = this.state.cropWidth * scale;
        const actualHeight = this.state.cropHeight * scale;

        const size = Math.min(actualWidth, actualHeight);
        tempCanvas.width = 400;
        tempCanvas.height = 400;

        tempCtx.drawImage(
            this.ui.originalImage,
            actualX, actualY, size, size,
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
    }

    onCropMouseDown(e) {
        e.preventDefault();
        const rect = this.ui.cropOverlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.state.startX = x;
        this.state.startY = y;
        this.state.startCropX = this.state.cropX;
        this.state.startCropY = this.state.cropY;
        this.state.startCropWidth = this.state.cropWidth;
        this.state.startCropHeight = this.state.cropHeight;

        const handle = this.getHandleAtPosition(x, y);
        if (handle) {
            this.state.isResizing = true;
            this.state.dragHandle = handle;
        } else if (this.isInsideCropArea(x, y)) {
            this.state.isDragging = true;
        } else {
            this.state.cropX = x;
            this.state.cropY = y;
            this.state.cropWidth = 0;
            this.state.cropHeight = 0;
            this.state.isDragging = true;
            this.updateCropSelection();
        }
    }

    onCropMouseMove(e) {
        if (!this.state.isDragging && !this.state.isResizing) return;

        const rect = this.ui.cropOverlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const deltaX = x - this.state.startX;
        const deltaY = y - this.state.startY;

        if (this.state.isDragging && !this.state.isResizing) {
            this.state.cropX = Math.max(0, Math.min(
                this.ui.cropCanvas.width - this.state.cropWidth,
                this.state.startCropX + deltaX
            ));
            this.state.cropY = Math.max(0, Math.min(
                this.ui.cropCanvas.height - this.state.cropHeight,
                this.state.startCropY + deltaY
            ));
        } else if (this.state.isResizing) {
            this.resizeCropSelection(deltaX, deltaY);
        }

        this.updateCropSelection();
    }

    onCropMouseUp() {
        this.state.isDragging = false;
        this.state.isResizing = false;
        this.state.dragHandle = null;
    }

    getHandleAtPosition(x, y, customTolerance = null) {
        const { cropX, cropY, cropWidth, cropHeight } = this.state;
        const tolerance = customTolerance || 15;

        const handles = {
            'nw': { x: cropX, y: cropY },
            'ne': { x: cropX + cropWidth, y: cropY },
            'sw': { x: cropX, y: cropY + cropHeight },
            'se': { x: cropX + cropWidth, y: cropY + cropHeight },
            'n': { x: cropX + cropWidth / 2, y: cropY },
            's': { x: cropX + cropWidth / 2, y: cropY + cropHeight },
            'w': { x: cropX, y: cropY + cropHeight / 2 },
            'e': { x: cropX + cropWidth, y: cropY + cropHeight / 2 }
        };

        for (const [handle, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) < tolerance && Math.abs(y - pos.y) < tolerance) {
                return handle;
            }
        }

        return null;
    }

    isInsideCropArea(x, y) {
        const { cropX, cropY, cropWidth, cropHeight } = this.state;
        return x >= cropX && x <= cropX + cropWidth &&
               y >= cropY && y <= cropY + cropHeight;
    }

    resizeCropSelection(deltaX, deltaY) {
        const handle = this.state.dragHandle;
        const { startCropX, startCropY, startCropWidth, startCropHeight } = this.state;
        const minSize = 50;

        switch (handle) {
            case 'nw':
                this.state.cropX = Math.max(0, startCropX + deltaX);
                this.state.cropY = Math.max(0, startCropY + deltaY);
                this.state.cropWidth = Math.max(minSize, startCropWidth - deltaX);
                this.state.cropHeight = Math.max(minSize, startCropHeight - deltaY);
                break;
            case 'ne':
                this.state.cropY = Math.max(0, startCropY + deltaY);
                this.state.cropWidth = Math.max(minSize, startCropWidth + deltaX);
                this.state.cropHeight = Math.max(minSize, startCropHeight - deltaY);
                break;
            case 'sw':
                this.state.cropX = Math.max(0, startCropX + deltaX);
                this.state.cropWidth = Math.max(minSize, startCropWidth - deltaX);
                this.state.cropHeight = Math.max(minSize, startCropHeight + deltaY);
                break;
            case 'se':
                this.state.cropWidth = Math.max(minSize, startCropWidth + deltaX);
                this.state.cropHeight = Math.max(minSize, startCropHeight + deltaY);
                break;
            case 'n':
                this.state.cropY = Math.max(0, startCropY + deltaY);
                this.state.cropHeight = Math.max(minSize, startCropHeight - deltaY);
                break;
            case 's':
                this.state.cropHeight = Math.max(minSize, startCropHeight + deltaY);
                break;
            case 'w':
                this.state.cropX = Math.max(0, startCropX + deltaX);
                this.state.cropWidth = Math.max(minSize, startCropWidth - deltaX);
                break;
            case 'e':
                this.state.cropWidth = Math.max(minSize, startCropWidth + deltaX);
                break;
        }

        this.state.cropX = Math.max(0, Math.min(
            this.ui.cropCanvas.width - this.state.cropWidth, this.state.cropX
        ));
        this.state.cropY = Math.max(0, Math.min(
            this.ui.cropCanvas.height - this.state.cropHeight, this.state.cropY
        ));
        this.state.cropWidth = Math.min(
            this.ui.cropCanvas.width - this.state.cropX, this.state.cropWidth
        );
        this.state.cropHeight = Math.min(
            this.ui.cropCanvas.height - this.state.cropY, this.state.cropHeight
        );
    }

    onCropTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.ui.cropOverlay.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        this.state.startX = x;
        this.state.startY = y;
        this.state.startCropX = this.state.cropX;
        this.state.startCropY = this.state.cropY;
        this.state.startCropWidth = this.state.cropWidth;
        this.state.startCropHeight = this.state.cropHeight;

        const handle = this.getHandleAtPosition(x, y, 25);
        if (handle) {
            this.state.isResizing = true;
            this.state.dragHandle = handle;
        } else if (this.isInsideCropArea(x, y)) {
            this.state.isDragging = true;
        } else {
            this.state.cropX = x;
            this.state.cropY = y;
            this.state.cropWidth = 0;
            this.state.cropHeight = 0;
            this.state.isDragging = true;
            this.updateCropSelection();
        }
    }

    onCropTouchMove(e) {
        e.preventDefault();
        if (!this.state.isDragging && !this.state.isResizing) return;

        const touch = e.touches[0];
        const rect = this.ui.cropOverlay.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const deltaX = x - this.state.startX;
        const deltaY = y - this.state.startY;

        if (this.state.isDragging && !this.state.isResizing) {
            this.state.cropX = Math.max(0, Math.min(
                this.ui.cropCanvas.width - this.state.cropWidth,
                this.state.startCropX + deltaX
            ));
            this.state.cropY = Math.max(0, Math.min(
                this.ui.cropCanvas.height - this.state.cropHeight,
                this.state.startCropY + deltaY
            ));
        } else if (this.state.isResizing) {
            this.resizeCropSelection(deltaX, deltaY);
        }

        this.updateCropSelection();
    }

    onCropTouchEnd() {
        this.state.isDragging = false;
        this.state.isResizing = false;
        this.state.dragHandle = null;
    }
}
