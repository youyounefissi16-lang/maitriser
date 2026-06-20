export const getPagination = (query) => {
  let page = Math.max(1, parseInt(query.page) || 1);
  let limit = Math.min(200, Math.max(1, parseInt(query.limit) || 50));
  return { skip: (page - 1) * limit, limit, page };
};

export const paginatedResponse = (data, total, page, limit) => ({
  data,
  total,
  page,
  pages: Math.ceil(total / limit),
});
