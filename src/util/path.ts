export function equal(path1: any[], path2: any[]) {
  return (
    path1.length === path2.length && path1.every((part, i) => part === path2[i])
  );
}
