export const messageKeys = {
  all: ['conversations'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (search: string) => [...messageKeys.lists(), search] as const,
  options: () => [...messageKeys.all, 'options'] as const,
  detail: (id: string) => [...messageKeys.all, 'detail', id] as const,
};
