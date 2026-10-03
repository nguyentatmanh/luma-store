import { notFound, validationError } from '../../common/errors.js';
import { transaction } from '../../database/pool.js';

function present(row) {
  if (!row) throw notFound();
  const { imageFile, illustration, ...product } = row;
  return {
    ...product, price: Number(product.price), stock: Number(product.stock),
    isActive: Boolean(product.isActive),
    imageUrl: imageFile ? '/media/' + imageFile : '/assets/products/' + illustration + '.svg',
  };
}

export function createProductService({ pool, products, inventory, images }) {
  async function checkCategory(id) {
    if (!await products.categoryExists(id)) throw validationError({ categoryId: 'Danh mục không tồn tại.' });
  }
  return {
    categories: () => products.categories(),
    async find(id) { return present(await products.find(id)); },
    async list(filters) {
      const result = await products.list(filters);
      return { ...result, items: result.items.map(present) };
    },
    async create(input) {
      await checkCategory(input.categoryId);
      const id = await transaction(pool, async connection => {
        const newId = await products.insert(input, connection);
        if (input.stock) {
          await inventory.insert({
            productId: newId, productName: input.name, kind: 'opening',
            quantity: input.stock, stockBefore: 0, stockAfter: input.stock,
            note: 'Tồn đầu kỳ khi thêm sản phẩm',
          }, connection);
        }
        return newId;
      });
      return present(await products.find(id));
    },
    async update(id, input) {
      await checkCategory(input.categoryId);
      if (!await products.update(id, input)) throw notFound();
      return present(await products.find(id));
    },
    async uploadImage(id, file) {
      if (!await products.find(id)) throw notFound();
      const filename = await images.save(file);
      let previous;
      try {
        await transaction(pool, async connection => {
          const product = await products.lock(id, connection);
          if (!product) throw notFound();
          previous = product.image_file;
          await products.setImage(id, filename, connection);
        });
      } catch (error) {
        await images.remove(filename);
        throw error;
      }
      // Delete after commit: no request can leave DB pointing to a removed new image.
      if (previous) await images.remove(previous);
      return present(await products.find(id));
    },
  };
}
