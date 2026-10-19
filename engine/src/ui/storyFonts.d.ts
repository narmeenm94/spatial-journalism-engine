export type StoryFontFile = {src:string;weight?:string;style?:'normal'|'italic'|'oblique';unicodeRange?:string}
export type StoryFont = {id:string;name:string;family:string;files:StoryFontFile[];license?:string}
export function storyFontFaces(branding:any):Array<StoryFontFile & {family:string}>
export function installStoryFonts(branding:any,resolveAsset?:(path:string)=>string,onError?:(family:string)=>void):()=>void
