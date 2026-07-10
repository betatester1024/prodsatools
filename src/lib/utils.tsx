"use client"


import React, { ButtonHTMLAttributes, ChangeEvent, FormEvent, HTMLProps, InputHTMLAttributes, KeyboardEvent, ReactElement, ReactNode, useEffect, useState } from "react";
import { Item } from "./dsabp";
import { Themes } from "./Themes";
import Link from "next/link";

export type ColourTheme = {textCls:string, activeCls:string, hoverCls:string, bgMain:string, bgLight:string, bgStrong:string};

export function byId(id:string) {
  return document.getElementById(id);
} 

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  theme:ColourTheme, 
  children?:ReactNode, 
  className?:string, 
};

export function ExternLink(props:{href:string, className?:string, children:string|ReactNode}) {
  return <Link className={"inline-flex items-center !no-underline " + props.className} href={props.href} target="_blank" prefetch={false}>
    <span className="underline">{props.children}</span>
    <GIcon>open_in_new</GIcon>
  </Link>
}

export function Header(props:{title:string|ReactNode, subtitle:string|ReactNode, className?:string}) {
  return  <header className={"flex flex-col justify-left text-2xl "+props.className}>
      <h1 className={`${Themes.BLUE.textCls} font-bold`}>{props.title}</h1>
      <p className={`${Themes.BLUE.textCls} text-base`}>{props.subtitle}</p>
    </header>
}

export function Button(props:ButtonProps) {
  let theme = props.theme;
  if (props.disabled) theme = Themes.GREY;
  return (
    <button 
      type={props.type} 
      id={props.id}
      tabIndex={props.tabIndex}
      onClick={props.onClick}
      disabled = {props.disabled}
      className={`${props.className} ${theme.textCls} ${theme.bgLight} ${props.disabled ? "" : theme.activeCls} ${props.disabled ? "" : theme.hoverCls} 
      ${props.disabled ? "" : "cursor-pointer"} rounded-sm p-2 transition-colors justify-center flex items-center `}
    >
      {props.children}
    </button>
  );
}


interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  theme:ColourTheme, 
  className?:string, 
  children?:ReactNode,
  ctnClassName?:string,
  id?:string
};

export function H1({theme=Themes.BLUE, children, extraClasses} : {theme?:ColourTheme, children?:ReactNode, extraClasses?:string}) {
  return <h1 className={`text-lg font-medium ${theme.textCls} ${extraClasses}`}>{children}</h1>
}

export function Input(props:InputProps) {
  return (
    <div className={`text-md ${props.theme.textCls} flex ${props.ctnClassName} relative ${props.children ? "" : "input flex-col"}`}>
      <input 
        type={props.type}
        id={props.id}
        tabIndex={props.tabIndex}
        defaultChecked={props.defaultChecked}
        checked = {props.checked}
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        min={props.min}
        max={props.max}
        // onClick={props.onClick}
        onChange={props.onChange}
        className={`${props.theme.textCls} ${props.theme.hoverCls} ${props.theme.bgLight}
        rounded-sm p-2 accent-current outline-current transition-colors justify-center flex items-center ${props.className} ${props.children ? "" : "grow"}`}
      />
      {props.children ? <label htmlFor={props.id} className="inline-block h-[100%] ml-1 cursor-pointer">{props.children}</label>: <></>}</div>
  );
}

export function ItemImg(params:{children:Item}) {
  return <img src={"https://drednot.io/img/"+params.children.image+".png"}/>
}

export function Lister(
{theme=Themes.BLUE, colLayout:gtc, children, className:extraClasses="", className_c} : 
{theme?:ColourTheme, colLayout?:string, children:ReactNode[][], className?:string, className_c?:string}) {
  let items: ReactNode[] = [];
  for (let i=0; i<children.length; i++) {
    let cols = [];
    for (let j=0; j<children[i].length; j++) {
      cols.push(
        <div key={j} className={className_c}>
          {children[i][j]}
        </div>
      );
    }
    items.push(<div 
      key={i}
      className={`grid grid-cols-subgrid ${theme.textCls} ${theme.hoverCls} transition-colors duration-250`} 
      style={{gridColumn: `span ${children[0].length}`}}>
      {cols}
    </div>);
  }
  return (
    <div 
      className={theme.textCls + " w-full grid grid-cols-3 "+extraClasses} 
      style={{ gridTemplateColumns: gtc ?? `repeat(${children.length == 0 ? 0 : children[0].length}, 1fr)` }}
    >
      {items}
    </div>
  )
}

export function escapeRegExp(str:string, anchor=false) {
  if (!str) return "";
  let out = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  if (anchor) return "^"+out+"$";
  else return out;
}
let zIdx = 1;
type OptionElement = React.ReactElement<OptionProps>;
export function Select({theme:clrTheme=Themes.BLUE, children, className, defaultIdx, onChange} : 
  {theme?:ColourTheme, children:OptionElement[]|OptionElement, className?:string, defaultIdx?:number, onChange?:(n:any)=>any}) {
  let [active, setActive] = useState<boolean>(false);
  let [filter, setFilter] = useState<string>("");
  // INDEXED TO ACTUAL CHILD IDX
  let [selIdx, setSelIdx] = useState<number>(defaultIdx!=undefined ? defaultIdx : -1);
  // FOR SEARCH ONLY - NOT INDEXED TO ACTUAL CHILD IDX - MUST CONVERT USING MATCH MATCHIDXES
  let [hoveringIdx, setHoveringIdx] = useState<number>(0); 

  let matchOptns = [];
  if ((children as OptionElement[]).length == null) {
    children = [children] as OptionElement[];
  }
  children = children as OptionElement[];
  let options= [];
  let optnValues = [];

  // for search only
  let matchIdxes:number[] = [];
  
  let matchingCt = 0;
  for (let i=0; i<children.length; i++) {
    let node = children[i];
    options.push(node.props.children);
    optnValues.push(node.props.value);
    //@ts-ignore
    let regex = new RegExp("("+escapeRegExp(filter)+")", "i")
    let matched = null;
    // do not match if no filter
    if (filter != "") matched = node.props.children.match(regex);
    //if (search produces something or no search) -- preserve for active dialogs for animations
    if (filter != "" && matched || filter == "") {
      let foundIdx = node.props.children.search(regex);
      matchIdxes.push(i);
      matchOptns.push(
        <div 
          key={JSON.stringify({idx:i, value:node.props.value})} 
          className={`${matchingCt == hoveringIdx ? clrTheme.bgMain : ""} ${clrTheme.textCls} ${clrTheme.activeCls} 
          ${clrTheme.bgLight} transition-colors cursor-pointer p-1 pr-1.5 pl-1.5 ${clrTheme.hoverCls} 
          ${i==selIdx ? "border-l-[4px]" :""} `}
          onMouseUp={()=>{setSelIdx(i); setActive(false);}}  
        >
          <span>{
            matched ? 
            <><span>{node.props.children.substring(0, foundIdx)}</span>
            <b>{matched[1]}</b>
            <span>{node.props.children.substring(foundIdx+matched[1].length)}</span></>
            : node.props.children
          }</span>
        </div>
      );
      matchingCt++;
    } // if match or no search
  } // for options

  let [inputVal, setInputVal] = useState<string>("");
  useEffect(()=>{
    if (!active) {
      setFilter(options[selIdx]);
      setInputVal(selIdx >= 0 ? options[selIdx] : "Select...");
    }
    else {
      zIdx++;
      setFilter("");
      setInputVal("");
      setHoveringIdx(selIdx);
    }
  }, [active])

  useEffect(()=>{
    if (onChange) onChange(optnValues[selIdx])
  }, [selIdx])

  function onKeyPress(event:ChangeEvent<HTMLInputElement>) {
    setFilter(event.target.value);  
    setInputVal(event.target.value);
    setHoveringIdx(0);
  }

  function keydown(event:KeyboardEvent) {
    if (!active) {
      if (event.key == "Enter" || event.key == " ") {
        setActive(true);
        event.preventDefault();
      }
      return;
    }
    if (event.key == "ArrowUp") {
      setHoveringIdx(hoveringIdx-1);
      event.preventDefault();
    }
    else if (event.key == "ArrowDown") {
      setHoveringIdx(hoveringIdx+1);
      event.preventDefault();
    }
    if (event.key == "Enter") {
      if (matchIdxes.length > 0) setSelIdx(matchIdxes[hoveringIdx]);
      setActive(false);
      if (!event.ctrlKey) {
        event.preventDefault()
      }
    }
    if (event.key == "Escape") {
      setActive(false);
    }
  }

  function onMouseDown(event:React.MouseEvent<Element>) {
    if (!active) {
      setActive(true);
      event.preventDefault();
      // event blocks hover event triggers
      // and prevents one-click selection
      // however do not block event for editing input selection after modal is open
    }
    else if (active && filter == "") {
      setActive(false);
    }
  }
  function onMouseUp(event:React.MouseEvent<Element>) {
    let inp = event.target as HTMLInputElement;
    if (!clickComplete) { // do not focus input until mouse released
      clickComplete = true;
      inp.focus();
    }
  }

  useEffect(()=>{
    if (matchOptns.length == 0) return;
    if (hoveringIdx < 0) setHoveringIdx(matchOptns.length - 1);
    if (hoveringIdx >= matchOptns.length) setHoveringIdx(0);
  }, [hoveringIdx])


  let clickComplete = false;
  let out = (
    <div className={`${clrTheme.textCls} focus-within:outline-2 
    relative ${active ? "outline-solid" : "outline-none" } h-[fit-content] rounded-md rounded-b-none ${className??""}`}
    >
      <div className="flex rounded-[inherit] overflow-clip">
      <input value={inputVal} readOnly={!active} onKeyDown={keydown} onChange={onKeyPress}
          onMouseDown={onMouseDown}
          onMouseUp= {onMouseUp}
          className={`w-[100%] ${clrTheme.textCls} ${clrTheme.bgLight} text-lg ${active && filter != "" ? "" : "cursor-pointer"} 
            transition-colors duration-250 p-1.5 grow-3 rounded-r-none outline-none 
            ${active ? "" : clrTheme.hoverCls} select-none pr-7`
          }
          placeholder="Search..."
        />
        <Button tabIndex={active ? 0 : -1} onClick={()=>{setActive(false)}} className={`h-3px ${Themes.GREY.bgMain} 
        ${active ? "rounded-l-none w-md" : "!p-0 w-0 overflow-clip"} max-w-[fit-content] !transition-all`} 
        type="button" theme={Themes.GREY}>
          <GIcon theme={clrTheme}>close</GIcon>
        </Button>
        <Button tabIndex={-1} className={`pointer-events-none
        ${!active ? "" : "opacity-0"} absolute top-0 bottom-0 right-0 max-w-[fit-content] !transition-all`} 
        type="button" theme={Themes.BLUE}>
          <GIcon theme={clrTheme} className="text-xl">arrow_drop_down</GIcon>
        </Button>
      </div>
      <div tabIndex={-1} className={
        `w-[100%] h-[fit-content] ${active ? "max-h-[50vh]" : "max-h-[0px]"} flex flex-col 
        overflow-scroll absolute transition-all duration-350 rounded-b-sm shadow-lg/40
        ${active ? "outline-solid outline-1":""} ${matchOptns.length == 0 ? Themes.RED.textCls : ""}`}
        style={{zIndex:zIdx}}>
        { 
          matchOptns.length == 0 ?
            <span key="none" className={`p-1 pr-1.5 pl-1.5 ${Themes.RED.textCls} ${Themes.RED.hoverCls} ${Themes.RED.bgLight}`}>No results found</span>
          : matchOptns
        }
      </div>
    </div>
  );
  return out;
}

export function GIcon({theme, className, children}:{theme?:ColourTheme, className?:string, children:string}) {
  return <div className={theme?.textCls + " inline-flex justify-center items-center "+className} >
    <span className="gicons !no-underline">
      {children}
    </span>
  </div>
}

interface OptionProps {
  children: string,
  value?:any
}
export function Option(props : OptionProps) {
  return <></>;
}

export function Loader(
  {theme, active=false} : 
  {theme:ColourTheme, active?:boolean}) {
  return (
    <div style={{transform:(active ? "" : "translateX(20px)")}} className="transition-transform">
      <svg className={(active ? "w-[20px] h-[20px] opacity-100 mr-2" : "w-[0px] opacity-0" )
        + " " + theme.textCls + " fill-current spinner size-5 transition-colors"} 
        viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z"></path>
      </svg>
    </div>
  )
}