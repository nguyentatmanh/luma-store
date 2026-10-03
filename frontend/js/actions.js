import { api, ApiError } from './api.js';
import { esc, money, number, productCell, icon, toast, busy, clearErrors, formError } from './ui.js';

export function initActions(getCategories) {
  const productDialog = document.querySelector('#product-dialog');
  const productForm = document.querySelector('#product-form');
  const productError = document.querySelector('#product-error');
  const productSubmit = document.querySelector('#product-submit');
  const fileInput = document.querySelector('#product-image');
  const stockDialog = document.querySelector('#stock-dialog');
  const stockForm = document.querySelector('#stock-form');
  const stockError = document.querySelector('#stock-error');
  const stockSubmit = document.querySelector('#stock-submit');
  let editing = null;
  let stockProduct = null;
  let previewUrl;
  let saving = false;

  function revokePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
  }
  async function openProduct(id) {
    if (saving) return;
    const categories = getCategories();
    if (!categories.length) return toast('Danh mục chưa sẵn sàng. Hãy thử tải lại.', 'error');
    const product = id ? await api.product(id) : null;
    editing = product;
    productForm.reset(); fileInput.value = ''; revokePreview();
    clearErrors(productForm, productError);
    document.querySelector('#product-category').innerHTML = '<option value="">Chọn danh mục</option>' +
      categories.map(category => '<option value="' + category.id + '">' + esc(category.name) + '</option>').join('');
    const values = product || { name: '', sku: '', categoryId: '', price: '', description: '', lowStockAt: 5, stock: 0, isActive: true };
    for (const [key, value] of Object.entries(values)) {
      const field = productForm.elements.namedItem(key);
      if (field) field.value = String(value);
    }
    const title = product ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm';
    document.querySelector('#product-dialog-title').textContent = title;
    productSubmit.textContent = product ? 'Lưu thay đổi' : 'Thêm sản phẩm';
    document.querySelector('#opening-stock-field').classList.toggle('hidden', !!product);
    document.querySelector('#product-stock').disabled = !!product;
    document.querySelector('#edit-stock-note').classList.toggle('hidden', !product);
    document.querySelector('#product-preview').src = product?.imageUrl || '/assets/products/box.svg';
    document.querySelector('#product-image-name').textContent = product ? 'Ảnh hiện tại' : 'Ảnh minh họa mặc định';
    productDialog.showModal();
    document.querySelector('#product-name').focus();
  }

  fileInput.addEventListener('change', () => {
    revokePreview();
    const file = fileInput.files[0];
    const restorePreview = () => {
      document.querySelector('#product-preview').src = editing?.imageUrl || '/assets/products/box.svg';
      document.querySelector('#product-image-name').textContent = editing ? 'Ảnh hiện tại' : 'Ảnh minh họa mặc định';
    };
    if (!file) { restorePreview(); return; }
    if (file.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      fileInput.value = '';
      restorePreview();
      toast('Chọn ảnh JPEG, PNG hoặc WebP tối đa 8 MB.', 'error'); return;
    }
    previewUrl = URL.createObjectURL(file);
    document.querySelector('#product-preview').src = previewUrl;
    document.querySelector('#product-image-name').textContent = file.name;
  });
  productDialog.addEventListener('close', revokePreview);

  productForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    clearErrors(productForm, productError);
    if (!productForm.reportValidity()) return;
    const values = new FormData(productForm);
    const payload = {
      sku: values.get('sku'), name: values.get('name'), description: values.get('description'),
      categoryId: Number(values.get('categoryId')), price: Number(values.get('price')),
      lowStockAt: Number(values.get('lowStockAt')), isActive: values.get('isActive') === 'true',
      ...(!editing && { stock: Number(values.get('stock')) }),
    };
    const wasEditing = !!editing;
    let metadataSaved = false;
    saving = true; busy(productSubmit, true);
    try {
      editing = await api.saveProduct(editing?.id, payload);
      metadataSaved = true;
      if (fileInput.files[0]) editing = await api.uploadImage(editing.id, fileInput.files[0]);
      productDialog.close();
      toast(wasEditing ? 'Đã lưu thay đổi sản phẩm.' : 'Đã thêm sản phẩm mới.');
      document.dispatchEvent(new Event('data-changed'));
    } catch (error) {
      if (metadataSaved) {
        error = new ApiError('Thông tin sản phẩm đã lưu. Ảnh chưa tải lên: ' + error.message, error.status, error.fields);
        document.querySelector('#product-dialog-title').textContent = 'Chỉnh sửa sản phẩm';
        productSubmit.dataset.label = 'Lưu thay đổi';
        document.querySelector('#opening-stock-field').classList.add('hidden');
        document.querySelector('#product-stock').disabled = true;
        document.dispatchEvent(new Event('data-changed'));
      }
      formError(productForm, productError, error);
    } finally { saving = false; busy(productSubmit, false); }
  });

  function calculateStock() {
    const qty = Number(stockForm.elements.quantity.value || 0);
    const kind = stockForm.elements.kind.value;
    const next = stockProduct.stock + (kind === 'in' ? qty : -qty);
    const output = document.querySelector('#stock-calculation');
    output.innerHTML = 'Tồn hiện tại <strong>' + number(stockProduct.stock) + '</strong> ' + icon('arrow') + ' Sau phiếu <strong>' + number(next) + '</strong>';
    output.classList.toggle('invalid', next < 0);
  }
  stockForm.addEventListener('input', calculateStock);
  stockForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    clearErrors(stockForm, stockError);
    if (!stockForm.reportValidity()) return;
    saving = true; busy(stockSubmit, true);
    try {
      await api.move({
        productId: stockProduct.id, kind: stockForm.elements.kind.value,
        quantity: Number(stockForm.elements.quantity.value), note: stockForm.elements.note.value,
      });
      stockDialog.close();
      toast('Đã lưu phiếu và cập nhật tồn kho.');
      document.dispatchEvent(new Event('data-changed'));
    } catch (error) { formError(stockForm, stockError, error); }
    finally { saving = false; busy(stockSubmit, false); }
  });

  document.addEventListener('click', async event => {
    const close = event.target.closest('[data-close]');
    if (close && !saving) close.closest('dialog').close();
    const button = event.target.closest('[data-add], [data-edit], [data-stock]');
    if (!button || saving) return;
    button.disabled = true;
    try {
      if (button.hasAttribute('data-stock')) {
        stockProduct = await api.product(button.dataset.stock);
        if (!stockProduct.isActive) throw new ApiError('Khôi phục sản phẩm trước khi nhập/xuất kho.', 409);
        stockForm.reset(); clearErrors(stockForm, stockError);
        document.querySelector('#stock-product').innerHTML = productCell(stockProduct) + '<span>' + money(stockProduct.price) + '</span>';
        stockForm.elements.kind.value = button.dataset.kind || 'in';
        calculateStock(); stockDialog.showModal(); stockForm.elements.quantity.focus();
      } else {
        await openProduct(button.dataset.edit);
      }
    } catch (error) { toast(error.message, 'error'); }
    finally { button.disabled = false; }
  });
  for (const dialog of [productDialog, stockDialog]) {
    dialog.addEventListener('cancel', event => { if (saving) event.preventDefault(); });
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && !saving &&
          (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
  }
}
