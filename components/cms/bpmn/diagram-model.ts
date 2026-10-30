/** Utilitas diagram BPMN yang dipakai editor dan viewer (tanpa bergantung pada bpmn-js). */

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Diagram awal: Mulai → aktivitas → Selesai, dinamai sesuai probis. */
export function starterXml(name: string) {
  const task = escapeXml(name.slice(0, 120));
  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="https://spbe.gresikkab.go.id/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Mulai"><bpmn:outgoing>Flow_1</bpmn:outgoing></bpmn:startEvent>
    <bpmn:task id="Task_1" name="${task}"><bpmn:incoming>Flow_1</bpmn:incoming><bpmn:outgoing>Flow_2</bpmn:outgoing></bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="Selesai"><bpmn:incoming>Flow_2</bpmn:incoming></bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1"><dc:Bounds x="180" y="142" width="36" height="36" /><bpmndi:BPMNLabel><dc:Bounds x="184" y="185" width="28" height="14" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1"><dc:Bounds x="280" y="120" width="140" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1"><dc:Bounds x="492" y="142" width="36" height="36" /><bpmndi:BPMNLabel><dc:Bounds x="486" y="185" width="48" height="14" /></bpmndi:BPMNLabel></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1"><di:waypoint x="216" y="160" /><di:waypoint x="280" y="160" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2"><di:waypoint x="420" y="160" /><di:waypoint x="492" y="160" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
}

export type DiagramStats = { activities: number; gateways: number; events: number; lanes: number };

/** Hitung elemen dari daftar tipe BPMN (`bpmn:Task`, `bpmn:ExclusiveGateway`, …). */
export function countElements(types: string[]): DiagramStats {
  const stats: DiagramStats = { activities: 0, gateways: 0, events: 0, lanes: 0 };
  for (const type of types) {
    if (/Task$|SubProcess$|CallActivity$/.test(type)) stats.activities++;
    else if (type.endsWith("Gateway")) stats.gateways++;
    else if (type.endsWith("Event")) stats.events++;
    else if (type === "bpmn:Participant" || type === "bpmn:Lane") stats.lanes++;
  }
  return stats;
}

/** Warna garis/isi default bpmn-js dibaca dari token CSS, bukan hex di komponen. */
export function rendererColors() {
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => css.getPropertyValue(name).trim() || undefined;
  return { defaultStrokeColor: token("--brand-charcoal"), defaultLabelColor: token("--brand-charcoal") };
}

export function download(name: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** SVG → PNG lewat canvas (blob URL, sesuai CSP img-src). */
export async function svgToPng(svg: string, scale = 2) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Gagal menggambar diagram."));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat PNG."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
