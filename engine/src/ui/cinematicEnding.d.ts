export type CinematicSettings={fadeIn?:number;textDelay?:number;textDuration?:number;textFade?:number;quoteFade?:number;videoDelay?:number;actionsDelay?:number;videoOn?:'all'|'mobile'|'none';muted?:boolean;quoteTimings?:{hold:number;gap:number}[]}
export const cinematicDefaults:Required<CinematicSettings>
export function endingTimeline(config:any):any
export function sampleEnding(config:any,time:number):{duration:number;overlayOpacity:number;textOpacity:number;quoteIndex:number;quoteOpacity:number;videoVisible:boolean;videoTime:number;complete:boolean}
export function renderCinematicEnding(host:HTMLElement,config:any,options?:{language?:string;font?:string;mobile?:boolean;resolveAsset?:(path:string)=>string;onReplay?:()=>void}):()=>void

export function characterEndingTime(character:any,ending?:any):number
