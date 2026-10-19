export interface CaptionStyle {
 font?: string; fontSize?: number; mobileFontSize?: number; fontWeight?: number; lineHeight?: number;
 color?: string; backgroundColor?: string; backgroundOpacity?: number;
 align?: 'left' | 'center' | 'right'; position?: 'top' | 'bottom'; offset?: number;
 width?: number; maxWidth?: number; padding?: number; radius?: number; textShadow?: boolean
}
export const DEFAULT_CAPTION_STYLE: Readonly<Required<CaptionStyle>>
export function normalizeCaptionStyle(input?: CaptionStyle): Required<CaptionStyle>
export function captionStyles(input?: CaptionStyle, fallbackFont?: string, mobile?: boolean): { container: Record<string,string>; text: Record<string,string> }
