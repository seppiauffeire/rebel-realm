export function cardCanvas(design: any, rating: any, cardEl: HTMLElement): HTMLCanvasElement;
export function cardLink(design: any): string;
export function copyText(text: string): Promise<boolean>;
export function shareCard(design: any, rating: any): Promise<string>;
export function downloadCard(design: any, rating: any, cardEl: HTMLElement): Promise<boolean>;
