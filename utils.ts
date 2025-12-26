// Hello World
export function isDeeplyNested(path: string): boolean {
  return path.split('/').length > 5;
}