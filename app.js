class PhotoToPdfMerger {
    constructor() {
        this.images = [];
        this.initializeElements();
        this.attachEventListeners();
    }

    initializeElements() {
        this.dropZone = document.getElementById('dropZone');
        this.fileInput = document.getElementById('fileInput');
        this.selectBtn = document.getElementById('selectBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.generateBtn = document.getElementById('generateBtn');
        this.previewContainer = document.getElementById('previewContainer');
        this.previewSection = document.getElementById('previewSection');
        this.optionsSection = document.getElementById('optionsSection');
        this.buttonGroup = document.getElementById('buttonGroup');
        this.progress = document.getElementById('progress');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.orientationSelect = document.getElementById('orientation');
        this.formatSelect = document.getElementById('format');
        this.scalingSelect = document.getElementById('scaling');
    }

    attachEventListeners() {
        this.selectBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e));
        this.clearBtn.addEventListener('click', () => this.clearImages());
        this.generateBtn.addEventListener('click', () => this.generatePdf());
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addImages(files);
    }

    handleDragOver(e) {
        e.preventDefault();
        this.dropZone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropZone.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));
        this.addImages(imageFiles);
    }

    addImages(files) {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.images.push({
                    src: e.target.result,
                    name: file.name,
                    type: file.type
                });
                this.updateUI();
            };
            reader.readAsDataURL(file);
        });
    }

    updateUI() {
        if (this.images.length === 0) {
            this.previewSection.style.display = 'none';
            this.optionsSection.style.display = 'none';
            this.buttonGroup.style.display = 'none';
            this.progress.style.display = 'none';
            this.dropZone.style.display = 'block';
        } else {
            this.dropZone.style.display = 'none';
            this.optionsSection.style.display = 'block';
            this.previewSection.style.display = 'block';
            this.buttonGroup.style.display = 'flex';
            this.renderPreviews();
        }
    }

    renderPreviews() {
        this.previewContainer.innerHTML = '';
        this.images.forEach((img, index) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${img.src}" alt="Preview ${index + 1}">
                <span class="index">${index + 1}</span>
                <button class="remove-btn" data-index="${index}">×</button>
            `;
            this.previewContainer.appendChild(div);
        });

        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.images.splice(index, 1);
                this.updateUI();
            });
        });
    }

    clearImages() {
        this.images = [];
        this.fileInput.value = '';
        this.updateUI();
    }

    async generatePdf() {
        if (this.images.length === 0) {
            alert('Please select at least one image');
            return;
        }

        this.progress.style.display = 'block';
        this.generateBtn.disabled = true;

        try {
            const { PDFDocument, rgb } = PDFLib;
            const pdfDoc = await PDFDocument.create();

            const orientation = this.orientationSelect.value;
            const format = this.formatSelect.value;
            const scaling = this.scalingSelect.value;

            const pageSizes = {
                A4: [595, 842],
                Letter: [612, 792],
                A5: [420, 595]
            };

            let pageWidth, pageHeight;
            const [w, h] = pageSizes[format];

            if (orientation === 'landscape') {
                pageWidth = Math.max(w, h);
                pageHeight = Math.min(w, h);
            } else {
                pageWidth = Math.min(w, h);
                pageHeight = Math.max(w, h);
            }

            const totalImages = this.images.length;

            for (let i = 0; i < totalImages; i++) {
                this.progressText.textContent = `Processing image ${i + 1} of ${totalImages}...`;
                this.progressBar.style.width = `${((i + 1) / totalImages) * 100}%`;

                const img = this.images[i];
                const imgData = await this.getImageData(img.src);

                const page = pdfDoc.addPage([pageWidth, pageHeight]);
                let drawWidth = pageWidth;
                let drawHeight = pageHeight;
                let x = 0;
                let y = 0;

                const imgAspectRatio = imgData.width / imgData.height;
                const pageAspectRatio = pageWidth / pageHeight;

                if (scaling === 'fit') {
                    if (imgAspectRatio > pageAspectRatio) {
                        drawWidth = pageWidth;
                        drawHeight = pageWidth / imgAspectRatio;
                    } else {
                        drawHeight = pageHeight;
                        drawWidth = pageHeight * imgAspectRatio;
                    }
                    x = (pageWidth - drawWidth) / 2;
                    y = (pageHeight - drawHeight) / 2;
                } else if (scaling === 'fill') {
                    if (imgAspectRatio > pageAspectRatio) {
                        drawHeight = pageHeight;
                        drawWidth = pageHeight * imgAspectRatio;
                    } else {
                        drawWidth = pageWidth;
                        drawHeight = pageWidth / imgAspectRatio;
                    }
                    x = (pageWidth - drawWidth) / 2;
                    y = (pageHeight - drawHeight) / 2;
                }

                const image = await pdfDoc.embedPng(imgData.data);
                page.drawImage(image, {
                    x: x,
                    y: y,
                    width: drawWidth,
                    height: drawHeight
                });

                await new Promise(resolve => setTimeout(resolve, 10));
            }

            const pdfBytes = await pdfDoc.save();
            this.downloadPdf(pdfBytes);

            this.progressText.textContent = 'PDF generated successfully!';
            setTimeout(() => {
                this.progress.style.display = 'none';
                this.generateBtn.disabled = false;
            }, 1500);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF: ' + error.message);
            this.progress.style.display = 'none';
            this.generateBtn.disabled = false;
        }
    }

    getImageData(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                canvas.toBlob(blob => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        resolve({
                            data: reader.result,
                            width: img.width,
                            height: img.height
                        });
                    };
                    reader.readAsArrayBuffer(blob);
                }, 'image/png');
            };
            img.onerror = reject;
            img.src = src;
        });
    }

    downloadPdf(pdfBytes) {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `merged_photos_${new Date().getTime()}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PhotoToPdfMerger();
});
