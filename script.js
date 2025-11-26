document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-input');
    const dropZone = document.getElementById('drop-zone');
    const svgInputText = document.getElementById('svg-input-text');
    const svgPreviewContainer = document.getElementById('svg-preview-container');
    const imageOutputContainer = document.getElementById('image-output-container');
    const btnConvertPng = document.getElementById('btn-convert-png');
    const btnConvertJpeg = document.getElementById('btn-convert-jpeg');
    const btnDownload = document.getElementById('btn-download');
    const btnCopy = document.getElementById('btn-copy');

    let currentSvgContent = null;
    let currentImageUrl = null;
    let currentImageBlob = null;
    let currentFormat = 'png';

    // File Upload Handling
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = (event) => {
                updateSvgPreview(event.target.result);
            };
            reader.readAsText(file);
        }
    });

    // Drag and Drop Handling
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'image/svg+xml') {
            const reader = new FileReader();
            reader.onload = (event) => {
                updateSvgPreview(event.target.result);
            };
            reader.readAsText(file);
        }
    });

    // Text Paste Handling
    svgInputText.addEventListener('input', (e) => {
        updateSvgPreview(e.target.value);
    });

    function updateSvgPreview(svgContent) {
        // Basic validation
        if (!svgContent.trim().startsWith('<svg') && !svgContent.includes('<svg')) {
            // Allow some flexibility but generally expect SVG tag
            if (svgContent.trim().length > 0) {
                // Maybe show error or just ignore
            }
            return;
        }

        currentSvgContent = svgContent;
        svgPreviewContainer.innerHTML = svgContent;

        // Ensure SVG has width and height for proper rendering
        const svgElement = svgPreviewContainer.querySelector('svg');
        if (svgElement) {
            if (!svgElement.getAttribute('width')) svgElement.setAttribute('width', '100%');
            if (!svgElement.getAttribute('height')) svgElement.setAttribute('height', '100%');
            // Preserve aspect ratio if not set
            if (!svgElement.getAttribute('preserveAspectRatio')) svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
    }

    // Conversion Logic
    async function convertToImage(format) {
        if (!currentSvgContent) {
            alert('Please upload or paste an SVG first.');
            return;
        }

        const svgElement = svgPreviewContainer.querySelector('svg');
        if (!svgElement) return;

        // Get dimensions
        const bbox = svgElement.viewBox.baseVal;
        let width = svgElement.width.baseVal.value;
        let height = svgElement.height.baseVal.value;

        // Fallback to viewBox if width/height are 0 or percent
        if (width === 0 && bbox && bbox.width > 0) width = bbox.width;
        if (height === 0 && bbox && bbox.height > 0) height = bbox.height;

        // If still no dimensions, default to something reasonable or try getBoundingClientRect (less reliable off-screen)
        if (!width || !height) {
            width = 800;
            height = 600;
        }

        // Create a canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Serialize the SVG DOM element to ensure we get any modifications (like width/height)
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);

        // Create Image from SVG
        const img = new Image();
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            // For JPEG, fill background with white (since JPEG doesn't support transparency)
            if (format === 'jpeg') {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0, width, height);

            const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            currentImageUrl = canvas.toDataURL(mimeType);

            // Display result
            imageOutputContainer.innerHTML = `<img src="${currentImageUrl}" alt="Converted Image">`;

            // Enable buttons
            btnDownload.disabled = false;
            btnCopy.disabled = false;
            currentFormat = format;

            // Create Blob for clipboard/download
            canvas.toBlob((blob) => {
                currentImageBlob = blob;
            }, mimeType);

            URL.revokeObjectURL(url);
        };

        img.onerror = (e) => {
            console.error('Error loading SVG image', e);
            alert('Error converting SVG. Please check the console for details.');
        };

        img.src = url;
    }

    btnConvertPng.addEventListener('click', () => convertToImage('png'));
    btnConvertJpeg.addEventListener('click', () => convertToImage('jpeg'));

    // Download
    btnDownload.addEventListener('click', () => {
        if (!currentImageUrl) return;
        const link = document.createElement('a');
        link.download = `converted-image.${currentFormat}`;
        link.href = currentImageUrl;
        link.click();
    });

    // Copy to Clipboard
    btnCopy.addEventListener('click', async () => {
        if (!currentImageBlob) return;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    [currentImageBlob.type]: currentImageBlob
                })
            ]);
            const originalText = btnCopy.innerText;
            btnCopy.innerText = 'Copied!';
            setTimeout(() => {
                btnCopy.innerText = originalText;
            }, 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('Failed to copy to clipboard. Browser might not support this format.');
        }
    });
});
