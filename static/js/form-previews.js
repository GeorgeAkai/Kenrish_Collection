document.addEventListener('DOMContentLoaded', function(){
  // For every multipart form, attach preview behavior to each file input
  document.querySelectorAll('form[enctype="multipart/form-data"]').forEach(function(form){
    form.querySelectorAll('input[type="file"]').forEach(function(fileInput){
      // Try to find an existing preview element within the same form
      let previewContainer = fileInput.closest('form').querySelector('.file-preview-container');
      let previewImg = fileInput.closest('form').querySelector('.file-preview-img');

      // If a single-element id-based preview exists (older templates), prefer it
      if(!previewContainer) previewContainer = fileInput.closest('form').querySelector('#file-preview-container');
      if(!previewImg) previewImg = fileInput.closest('form').querySelector('#file-preview');

      // If neither exists, create a preview container and insert after the file input
      if(!previewContainer){
        previewContainer = document.createElement('div');
        previewContainer.className = 'mb-3 text-center file-preview-container';
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '<label class="form-label fw-semibold" style="color:var(--button-background);">Preview</label>' +
                                     '<div><img class="file-preview-img img-fluid rounded mt-2" src="" alt="preview" style="max-height:140px; border:1px solid var(--border-color); padding:4px; background:#fff;"></div>';
        fileInput.parentNode.insertBefore(previewContainer, fileInput.nextSibling);
        previewImg = previewContainer.querySelector('.file-preview-img');
      }

      // Ensure previewImg and previewContainer are defined
      if(!previewImg || !previewContainer) return;

      // Listen for changes and show preview
      fileInput.addEventListener('change', function(){
        const f = this.files && this.files[0];
        if(f){
          try{
            previewImg.src = URL.createObjectURL(f);
            previewContainer.style.display = 'block';
          }catch(e){
            // fallback: do nothing
            previewImg.src = '';
            previewContainer.style.display = 'none';
          }
        } else {
          previewImg.src = '';
          previewContainer.style.display = 'none';
        }
      });
    });
  });
});
