export function containsPoint(rect, x, y) {
  return rect.left < x && x < rect.right && rect.top < y && y < rect.bottom;
}
