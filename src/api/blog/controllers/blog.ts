/**
 * blog controller
 */

import { factories } from '@strapi/strapi'
import customController from './custom'; // 👈 import your object of functions


export default factories.createCoreController('api::blog.blog',({ strapi }) => ({
  ...customController, // ✅ spread the object of controller functions
}));
