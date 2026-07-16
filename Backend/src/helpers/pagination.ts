export const pagination = (objectPagination: any, totalTasks: number, query: any) => {
  if (query.page) {
    objectPagination.page = query.page;
  }
  if (query.limit) {
    objectPagination.limit = query.limit;
  }
  objectPagination.totalPage = Math.ceil(totalTasks / objectPagination.limit);
  objectPagination.skip = (objectPagination.page - 1) * objectPagination.limit;
  // Exact total item count — additive field, safe for existing consumers that ignore it
  objectPagination.totalItems = totalTasks;

  return objectPagination;
}