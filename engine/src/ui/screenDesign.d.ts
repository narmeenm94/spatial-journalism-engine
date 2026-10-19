export type ScreenLayout = {x:number;y:number;width:number;height:number}
export type ScreenAction = {type:'start'|'screen'|'link'|'choice'|'language';mode?:'auto'|'3d'|'ar'|'vr';navigation?:'ask'|'guided'|'explore';screenId?:string;url?:string;language?:string}
export type ScreenElement = {id:string;type:'text'|'button'|'image';text:Record<string,string>;description?:Record<string,string>;showAfter?:number;scrollable?:boolean;src?:string;srcByLanguage?:Record<string,string>;layout:ScreenLayout;mobileLayout?:ScreenLayout;style:{fontSize:number;color:string;background:string;radius:number;align:'left'|'center'|'right';font?:string;fontWeight?:number;fontStyle?:'normal'|'italic';borderWidth?:number;borderColor?:string};animation:'none'|'fade'|'rise'|'pulse'|'drift-vertical'|'drift-horizontal'|'depth'|'breathe';action?:ScreenAction;sprite?:{frames:number;fps:number}}
export type DesignedScreen = {defaultNavigation?:'guided'|'explore';showFor?:'guided'|'explore';skipTo?:string;introVideo?:{sources:Record<string,string>;muted?:boolean;onEnd:ScreenAction};id:string;name:string;background:{color:string;image:string;video:string;overlay:number};mobileBackground?:{color:string;image:string;video:string;overlay:number};elements:ScreenElement[]}
export type ScreenDesign = {enabled:boolean;homeScreenId:string;screens:DesignedScreen[]}
export function createScreenDesign(ui:any,title:string,preset?:string):ScreenDesign
export function renderDesignedScreen(host:HTMLElement,screen:DesignedScreen,options:{navigation?:string;requireStartGesture?:boolean;language?:string;mobile?:boolean;editing?:boolean;selectedId?:string;resolveAsset?:(path:string)=>string;onSelect?:(id:string)=>void;onMove?:(id:string,layout:ScreenLayout)=>void;onAction?:(action:ScreenAction)=>void}):()=>void
export function screenDesignMedia(design?:ScreenDesign):string[]

export function clampScreenLayout(layout:ScreenLayout):ScreenLayout

export function addIntroFlow(design: ScreenDesign): string
export function screenActions(screen: DesignedScreen): ScreenAction[]
export function mergeLaunchChoice(previous: ScreenAction, action: ScreenAction): ScreenAction

export function resolveScreenTarget(design:ScreenDesign,id:string,navigation?:string):DesignedScreen|null
export function screenChoice(screen:DesignedScreen,previous?:{navigation?:string}):{navigation?:string}

export function addModeChooser(design:ScreenDesign):string
