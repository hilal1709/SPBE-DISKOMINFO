import { anim, composition, ease, ellipse, fill, group, layer, palette as c, path, pingPong, rect, stroke, trim } from "./lib.mjs";

/** Original dashboard illustration: six domain symbols, growing bars and a floating information strip. */
export function spbeOverview() {
  const frames = 240;
  const colors = [c.teal, c.orange, c.yellow, c.amber, c.sky, c.charcoal];
  const pop = (t) => anim([[0, [0, 0]], [t, [0, 0]], [t + 18, [100, 100]], [200, [100, 100]], [228, [0, 0]], [frames, [0, 0]]]);
  const symbols = [
    [path([[-6, -5], [0, -5], [0, 5], [6, 5]]), rect(4, 4, 1, [-6, -5]), rect(4, 4, 1, [6, 5])],
    [ellipse(9, 9, [0, -3]), path([[-7, 7], [-7, 3], [7, 3], [7, 7]])],
    [ellipse(15, 6, [0, -5]), path([[-7, -5], [-7, 6], [7, 6], [7, -5]]), path([[-7, 0], [7, 0]])],
    [rect(16, 12, 2), path([[-7, -2], [7, -2]])],
    [rect(16, 6, 1, [0, -4]), rect(16, 6, 1, [0, 5])],
    [path([[-7, -7], [7, -7], [7, 2], [0, 9], [-7, 2]], true)],
  ];
  return composition("spbe-overview", { w: 240, h: 160, frames, layers: [
    layer("information", [group([rect(64, 8, 4), fill(c.teal)]), group([rect(36, 4, 2, [0, 12]), fill(c.slateSoft)])], { p: pingPong([170, 24], [170, 20], frames) }),
    ...colors.map((color, i) => layer(`domain-${i}`, [group([...symbols[i], stroke(i === 5 ? c.white : c.charcoal, 1.5)]), group([rect(35, 28, 6), fill(color)])], { p: [46 + i % 3 * 45, 52 + Math.floor(i / 3) * 36], s: pop(8 + i * 13) })),
    ...colors.map((color, i) => layer(`inventory-${i}`, group([rect(10, 12 + i * 6, 2), fill(color)]), { p: [47 + i * 27, 133 - i * 3], s: anim([[0, [100, 0]], [45 + i * 8, [100, 0]], [100 + i * 8, [100, 100]], [200, [100, 100]], [228, [100, 0]], [frames, [100, 0]]]) })),
    layer("dashboard", [group([rect(198, 116, 10), fill(c.white), stroke(c.line, 2)]), group([rect(216, 140, 20), fill(c.amberPale)])], { p: [120, 84] }),
  ].reverse() });
}

/** Original direct-link tutorial: selected center, three immediate neighbors and moving information. */
export function domainIntegration() {
  const frames = 240, center = [116, 82];
  const neighbors = [[42, 44], [192, 38], [192, 126]];
  const highlight = anim([[0, 18], [48, 18], [72, 100], [192, 100], [224, 18], [frames, 18]]);
  return composition("domain-integration", { w: 240, h: 160, frames, layers: [
    layer("selection", group([ellipse(44, 44), stroke(c.charcoal, 2)]), { p: center, s: pingPong([95, 95], [112, 112], 120), o: highlight }),
    layer("selected-record", [group([rect(12, 4, 2, [0, -3]), rect(8, 3, 1, [-2, 4]), fill(c.charcoal)]), group([ellipse(30, 30), fill(c.yellow)])], { p: center }),
    ...neighbors.map(([x, y], i) => layer(`neighbor-${i}`, [group([rect(12, 3, 1), fill(c.charcoal)]), group([rect(30, 25, 6), fill([c.teal, c.orange, c.sky][i])])], { p: pingPong([x, y], [x, y - 3], frames) })),
    ...neighbors.map((point, i) => layer(`information-flow-${i}`, group([ellipse(7, 7), fill(c.charcoal)]), { p: anim([[0, center], [65 + i * 10, center], [130 + i * 10, point], [190, point], [224, center], [frames, center]], ease.inOut), o: anim([[0, 0], [65 + i * 10, 0], [72 + i * 10, 100], [175, 100], [192, 0], [frames, 0]]) })),
    layer("direct-connections", neighbors.map((point) => group([path([center, point]), stroke(c.teal, 2.5), trim(0, anim([[0, 0], [48, 0], [92, 100], [192, 100], [224, 0], [frames, 0]]))])), { o: highlight }),
    layer("unselected-record", group([ellipse(15, 15), fill(c.slateSoft)]), { p: [48, 130] }),
    layer("background", group([ellipse(220, 144), fill(c.amberPale)]), { p: [120, 80] }),
  ].reverse() });
}
