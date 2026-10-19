/** Compact diagrams used as visual navigation. No external assets or story data. */
export function ToolArt({kind}:{kind:string}) {
  return <svg className={'tool-art tool-art-'+kind} viewBox="0 0 160 90" fill="none" aria-hidden="true" focusable="false">
    {kind==='assets'?<>
      <rect x="22" y="13" width="75" height="57" rx="2" fill="#f1f1ee" stroke="#c6bfac" transform="rotate(-7 22 13)"/>
      <rect x="51" y="22" width="85" height="57" rx="2" fill="#ffffff" stroke="#4b4b48" strokeWidth="1.5"/>
      <circle cx="115" cy="38" r="8" fill="#f3cf48"/><path d="m56 69 25-28 22 20 11-12 16 20" fill="#e5e5df" stroke="#4b4b48" strokeWidth="1.5"/>
    </>:kind==='camera'?<>
      <path d="M24 63C34 19 59 13 82 49S129 74 139 23" stroke="#8b8264" strokeWidth="2" strokeDasharray="4 5"/>
      <circle cx="24" cy="63" r="8" fill="#ffffff" stroke="#4b4b48"/><circle cx="139" cy="23" r="8" fill="#ffffff" stroke="#4b4b48"/>
      <rect x="58" y="25" width="48" height="35" rx="2" fill="#f4d451" stroke="#4b4b48" strokeWidth="1.5"/><circle cx="82" cy="42" r="10" fill="#ffffff" stroke="#4b4b48"/><path d="m105 36 13-7v27l-13-7" fill="#e5e5df" stroke="#4b4b48"/>
    </>:kind==='subtitles'?<>
      <rect x="20" y="17" width="120" height="56" rx="2" fill="#ffffff" stroke="#bbb4a0"/>
      <path d="m32 48 30-20 24 17 16-10 26 14" stroke="#d3cbb6" strokeWidth="2"/>
      <rect x="36" y="51" width="88" height="25" rx="2" fill="#f4d451" stroke="#655f48"/><path d="M46 60h67M52 67h54" stroke="#655f48" strokeWidth="3" strokeLinecap="round"/>
    </>:kind==='ui'?<>
      <rect x="23" y="12" width="114" height="66" rx="2" fill="#ffffff" stroke="#4b4b48" strokeWidth="1.5"/>
      <path d="M23 27h114" stroke="#c8c1ad"/><circle cx="32" cy="20" r="2" fill="#b9b099"/><circle cx="39" cy="20" r="2" fill="#b9b099"/>
      <path d="M38 41h64M38 48h44" stroke="#8f8670" strokeWidth="3" strokeLinecap="round"/>
      <rect x="38" y="57" width="36" height="12" rx="2" fill="#f4d451"/><rect x="80" y="57" width="36" height="12" rx="2" fill="#ededea"/>
      <path d="m118 59 3 22 6-6 8-2Z" fill="#29291f" stroke="#ffffff" strokeWidth="2"/>
    </>:kind==='soundscape'?<>
      <circle cx="80" cy="45" r="31" fill="#f6ebbb"/><path d="M24 40v10m10-19v28m10-35v42m10-29v16m10-39v62m10-45v14m10-26v38m10-46v54m10-37v20m10-27v34m10-23v12m10-9v6" stroke="#756742" strokeWidth="4" strokeLinecap="round"/>
    </>:kind==='lighting'?<>
      <path d="m80 18-48 56h96Z" fill="#f8df7e" opacity=".7"/><ellipse cx="80" cy="73" rx="49" ry="9" fill="#e6d8a6"/>
      <path d="M68 11h24l-4 17H72Z" fill="#ffffff" stroke="#4b4b48" strokeWidth="1.5"/><path d="m72 56 12-7 13 7-13 8Z" fill="#ffffff" stroke="#96875c"/><path d="M72 56v15l12 7 13-7V56M84 64v14" stroke="#96875c"/>
    </>:kind==='ending'?<>
      <rect x="34" y="13" width="92" height="64" rx="2" fill="#ffffff" stroke="#b9b09b"/><circle cx="80" cy="37" r="13" fill="#f4d451"/><path d="m74 37 4 4 9-10" stroke="#4b4b48" strokeWidth="2" strokeLinecap="round"/><path d="M54 59h52M67 66h26" stroke="#aaa18a" strokeWidth="3" strokeLinecap="round"/>
    </>:<>
      <rect x="21" y="23" width="118" height="51" rx="2" fill="#ffffff" stroke="#c6bfac"/>
      <rect x="30" y="33" width="47" height="12" rx="2" fill="#f4d451"/><rect x="82" y="33" width="48" height="12" rx="2" fill="#e1e1dc"/>
      <rect x="30" y="51" width="26" height="12" rx="2" fill="#e1e1dc"/><rect x="61" y="51" width="69" height="12" rx="2" fill="#ecece8"/>
      <path d="M70 17v63" stroke="#39382c" strokeWidth="2"/><path d="m64 13 6 8 6-8Z" fill="#39382c"/>
    </>}
  </svg>
}
