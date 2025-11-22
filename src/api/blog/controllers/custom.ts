
import schema from '../content-types/blog/schema.json';

const customController = {
  async getCategoriesEnum(ctx) {
    try {
      const categories = schema.attributes.category.enum;
      console.log('these are the categories content',categories);
      ctx.send(categories);

    } catch (error) {
      ctx.throw(500, error);
    }
  },
};

export default customController;
