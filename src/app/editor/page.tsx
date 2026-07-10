'use client';
import "./page.css";
// /<reference path="@/lib/utils.tsx"/>
import {Button, byId, Lister, Loader, Select, Option, GIcon, Input, escapeRegExp, Header} from "@/lib/utils"
import { Themes } from "@/lib/Themes";
import { ChangeEvent, FormEvent, MouseEvent, ReactNode, useEffect, useState } from "react";
import { BoMEntry, sortByItem, BuildEntry, BPSummary, sortConfig, getSummaryJSON } from "@/lib/bpprocessing";
import { buildCostForm, insuranceForm, matsCostForm } from "@/lib/formcreator";
import { Item } from "@/lib/dsabp";

// const { decode, encode } = require("dsabp-js")
// const dsabp = require("dsabp-js")
// const dsabp = require("@/lib/dsabp");

let errorSummary = {bom:[], order:[], width:0, height:0, cmdCt:0, RCDCost:0, error:"Error processing blueprint."};

export enum ProcessingOptns  {
  SORT = "Sort by item", DISPLAY="Display only", SORT_SAFE="Sort (safe)", SORT_RESTORE="Sort (restore)",
  ENTERREPAIRMODE = "Enter Repair Mode"
}
function isSort(a:ProcessingOptns|undefined) {
  return a == ProcessingOptns.SORT || a == ProcessingOptns.SORT_SAFE || a == ProcessingOptns.SORT_RESTORE || a == ProcessingOptns.ENTERREPAIRMODE;
}

enum FormOptns {
  MATSCOST, BUILD, INSURANCE
}

export default function Page() {
  
  const [bomSummary, setBomSummary] = useState<ReactNode[][]>([]);
  const [buildSummary, setBuildSummary] = useState<ReactNode[][]>([]);
  const [processError, setProcessError] = useState<string>();
  const [processing, setProcessing] = useState<boolean>(false);
  const [loadingBP, setLoadingBP] = useState<boolean>(false);
  const [resBP, setResBP] = useState<string[]>([""]);
  const [asyncSumm, setSummary] = useState<BPSummary>(errorSummary);
  const [cmd, setCmd] = useState<ProcessingOptns>();
  const [sortY, setsortY] = useState<boolean>(false);
  const [starterQ, setStarterQ] = useState<boolean>(true);
  const [aExpandoes, setSnap] = useState<boolean>(true);
  const [repairMode, setRepairMode] = useState<boolean>(false);
  const [outForm, setOutForm] = useState<string>("");
  const [calcRes, setCalcRes] = useState<string>("");
  const [calcOpen, setCalcOpen] = useState<boolean>(false);
  const [firstDisp, setFirst] = useState<Item[]>([]);
  const [lastDisp, setLast] = useState<Item[]>([]);
  const [formType, setFormType] = useState<FormOptns>();
  function handleKeyDown(this:Document, event:KeyboardEvent) {
    console.log("calcOpen", calcOpen);
    if (event.key == "=" && !calcOpen) {
      setCalcOpen(true);
      event.preventDefault();
    }
    else if (event.key == "=" && calcOpen) {
      runCalc();
      event.preventDefault();
    }
    if (event.key == "Escape") {
      setCalcOpen(false);
    }
  }

  useEffect(()=>{
    document.addEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(()=>{
    let ele = byId("calcRes") as HTMLParagraphElement;
    console.log("Calculation performed!");
    ele.classList.remove("animHighlight");
    setTimeout(()=>{ele.classList.add("animHighlight");}, 100);
  }, [calcRes])

  useEffect(()=> {
    let calcInp = byId("calc") as HTMLInputElement;
    calcInp.focus();
    if (!calcOpen) {
      calcInp.value = "";
    }
  }, [calcOpen]);

  let [prevStarterQ, setPSQ] = useState<boolean>(true)
  useEffect(()=>{
    
    setPSQ(starterQ);
    if (repairMode) setStarterQ(false);
    else setStarterQ(prevStarterQ)
  }, [repairMode])

  useEffect(()=>{
    processBP();
    delaySelectOutput();
  }, [cmd, formType])

  useEffect(()=>{
    if (!isSort(cmd)) {
      setResBP(["No blueprint sorting selected"]);
    }
  }, [cmd])

  // useEffect(() => {
  //   document.addEventListener('keydown', handleKeyDown);

  //   // Clean up the event listener when the component unmounts
  //   return () => {
  //     document.removeEventListener('keydown', handleKeyDown);
  //   };
  // }, []); // Empty dependency array ensures this runs only on mount and unmount

  useEffect(()=>{
    processBP();
  }, [starterQ, sortY, aExpandoes, repairMode])

  function formProcess(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    processBP();
    delaySelectOutput();
  }

  function formatBP(bp:string) {
    return bp.replaceAll("\n", "").trim();
  }

  async function processBP() {
    console.log("processing command", cmd);
    let tArea = byId("inBlueprint") as HTMLTextAreaElement;
    let bp = tArea.value;
    bp = formatBP(bp)
    let bpout = {bps:[bp], combined:bp}; // default for display only
    let summary : BPSummary;
    let processed = false;
    try {
      setProcessing(true);
      let firstStrs = (byId("firstItems") as HTMLInputElement).value.split(/, */);
      let lastStrs = (byId("lastItems") as HTMLInputElement).value.split(/, */);
      let firstItms = new Set<Item>(), lastItms = new Set<Item>();
      for (let st of firstStrs) {
        let matchExact = false;
        if (st.charAt(0) == "\"") {
          st = st.replaceAll("\"", "");
          matchExact = true;
        }
        console.log(matchExact, st);
        Item.getMap().forEach(
          (v:Item, _key:string, _map:Map<string, Item>)=>{
            if (st.length != 0 && v.name.match(new RegExp(escapeRegExp(st, matchExact), "i")))
              firstItms.add(v);
          });
      }
      for (let st of lastStrs) {
        let matchExact = false;
        if (st.charAt(0) == "\"") {
          st = st.replaceAll("\"", "");
          matchExact = true;
        }
        Item.getMap().forEach(
          (v:Item, _key:string, _map:Map<string, Item>)=>{
            if (st.length != 0 && v.name.match(new RegExp(escapeRegExp(st, matchExact), "i"))) lastItms.add(v);
          });
        }
      setFirst(Array.from(firstItms));
      setLast(Array.from(lastItms));
      let tArea2 = byId("inBlueprintR") as HTMLTextAreaElement;
      let repairBP = repairMode ? tArea2.value : "";
      repairBP = formatBP(repairBP)
      if (isSort(cmd)) {
        bpout = await sortBP(bp, {
          sortY:sortY, 
          mode: cmd,
          alignExpandoes:aExpandoes, 
          firstItems:Array.from(firstItms),
          lastItems:Array.from(lastItms),
          repairBP:repairBP
        });
        processed = true;
      }

      console.log("outbp", bp.slice(0, 300));
      summary = await getSummaryJSON(bpout!.combined, starterQ, repairBP);

      let formRes = "";
      // form
      switch (formType) {
        case FormOptns.MATSCOST:
          formRes = matsCostForm(summary, true).form;
          break;
        case FormOptns.BUILD:
          formRes = buildCostForm(summary, repairMode).form;
          break;
        case FormOptns.INSURANCE:
          let inp1 = byId("insurancePct") as HTMLInputElement;
          let inp2 = byId("insuranceRA") as HTMLInputElement;
          formRes = insuranceForm(summary, Number(inp1.value), Number(inp2.value)).form;
          break;
      }
      if (cmd == ProcessingOptns.SORT_RESTORE || cmd == ProcessingOptns.SORT_SAFE) 
        formRes = "This is (probably) not the mode you want.";
      setOutForm(formRes);
    } catch (e) {
      console.log(e);
      summary = errorSummary;
    }
    if (bpout!.bps.length == 0 && processed) {
      summary.error = "Sort operation failed.";
    }
    setSummary(summary);
    setProcessing(false);
    setProcessError(summary.error);
    if (summary.error) {
      return;
    }
    ///////////// update html parts
    
    let bomformatted = [];
    for (let entry of summary.bom) {
      bomformatted.push([
        <img className="w-[2.5rem]" src={"https://test.drednot.io/img/"+entry.it.image!+".png"}></img>,
        <p>{entry.ct.toLocaleString()}</p>,
        <p>{entry.it.name}</p>
      ]);
    }
    let buildformatted=  [];
    for (let entry of summary.order) {
      buildformatted.push([
        <img className="w-[2.5rem]" src={"https://test.drednot.io/img/"+entry.item.image+".png"}></img>,
        <p>{entry.count.toLocaleString()}</p>,
        <p>{entry.equalsStr}</p>,
        <p>{entry.item.name}</p>
      ]);
    }
    // if (!summary.error) {
      setBomSummary(bomformatted);
      setBuildSummary(buildformatted);
    // }
    // else {
      // return;
    // }
  } // process()

  function delaySelectOutput() {
    setTimeout(()=>{
      let out = byId("outBlueprint") as HTMLTextAreaElement;
      out.select();
    }, 200);
  }

  async function sortBP(value:string, config?:sortConfig) {
    let summary = await sortByItem(value, config);
    setResBP(summary.bps);
    return summary;
  }

  function itemsToHTML(arr:Item[]) {
    let out = [];
    for (let i=0; i<arr.length; i++) {
      let it = arr[i];
      out.push(<span className="flex items-center gap-1" key={i}>
        <img src={"https://drednot.io/img/"+it.image+".png"}/>
        {/* {arr.length <= 5 ? <span>{it.name}</span> : <></>} */}
      </span>);
    }
    return out;
  }

  async function fillTemplateBP() {
    let tArea = byId("inBlueprint") as HTMLTextAreaElement;
    setLoadingBP(true);
    let str;
    try {
      let rawDat = await fetch("/testbp.txt");
      str = await rawDat.text();
      if (rawDat.status != 200) str = "Could not load test blueprint.";
    } catch (e) {
      console.log(e);
      str = "Could not load test blueprint.";
    }
    
    tArea.value = str;
    setLoadingBP(false);
    processBP()
  }

  function updateProcessCommand(n:ProcessingOptns) {
    console.log("command set!", n);
    setCmd(n);
  }

  function updateFormCommand(n:FormOptns) {
    setFormType(n);
  }

  function runCalc() {
    let input = byId("calc") as HTMLInputElement;
    try {
      let val = eval(input.value);
      setCalcRes(toStackString(val));
    } catch (e:any) {
      setCalcRes("Error: " + e.toString());
    }
  }

  function toStackString(val:number) {
    return val.toString() + (val >= 16 ? " ~"+Math.ceil(val/16)+"stk":"");
  }
  return (<div tabIndex={0}><div className="flex flex-col gap-2 p-3">
    <title>ProDSA PrecisionEdit Tools | ProDSA Services</title>
    <meta name="description" content="PrecisionEdit blueprint editing for ProDSA Services use"/>
    <Header title="ProDSA PrecisionEdit Tools" subtitle="Developed by ProDSA Services - thanks to libraries from @blueyescat"></Header>
    <form onSubmit={formProcess}>
      <div className="flex gap-1 flex-wrap relative items-center">
        <textarea id="inBlueprint" placeholder="DSA:..." onChange={()=>{processBP()}}
          className={`${Themes.GREY.bgMain} ${Themes.BLUE.textCls} font-nsm`}>
        </textarea>
        <textarea id="inBlueprintR" placeholder="Repair base blueprint" onChange={()=>{processBP()}}
        className={`${Themes.GREY.bgMain} ${Themes.BLUE.textCls} shrink font-nsm transition-[max-width] overflow-clip 
        ${repairMode ? "max-w-[400px] pr-1 pl-1" : "max-w-[0px] !pl-0 !pr-0"}`}>
        </textarea> 
        <div className="flex flex-col">
          <Button type="button" disabled={process.env.NEXT_PUBLIC_BRANCH != "testing"} theme={Themes.BLUE} onClick={fillTemplateBP} className="h-[fit-content]">
            <Loader theme={Themes.BLUE} active={loadingBP}></Loader>
            Load test blueprint
          </Button>
          <Input theme={Themes.GREEN} type="checkbox" checked={repairMode} onChange={(event:ChangeEvent<HTMLInputElement>) => {setRepairMode(event.target.checked);}}
          ctnClassName="cursor-pointer" id="repairMode">Enter repair mode?</Input>
        </div>
        {/* <Link prefetch={false} href="/testbp.txt" className="text-blue-400 active:text-blue-200 cursor-pointer hover:text-blue-300" target="_blank">access test blueprint</a> */}
      </div>
      <div className="w-full flex gap-1 flex-wrap mt-2 items-center">
        <div className="flex flex-col items-left grow">
          <Select theme={Themes.BLUE} className="grow-1" defaultIdx={2} onChange={updateProcessCommand}>
            <Option value={ProcessingOptns.SORT}>Sort by item</Option>
            <Option value={ProcessingOptns.ENTERREPAIRMODE}>(Repair Mode) Disable loaders and hatches for repairs</Option>
            <Option value={ProcessingOptns.SORT_SAFE}>(Safe mode) Disable loaders and hatches</Option>
            <Option value={ProcessingOptns.SORT_RESTORE}>(Restore mode) Restore loader and hatch settings</Option>
            <Option value={ProcessingOptns.DISPLAY}>No processing - display only</Option>
          </Select>
          <div className="flex grow-1">
            <Select theme={Themes.BLUE} className="grow-1" defaultIdx={0} onChange={updateFormCommand}>
              <Option value={FormOptns.BUILD}>Build cost breakdown</Option>
              <Option value={FormOptns.MATSCOST}>Materials cost only</Option>
              <Option value={FormOptns.INSURANCE}>Insurance valuation</Option>
            </Select>
            <Input id="insurancePct" type="number" min={0} max={100} defaultValue={80} placeholder="Insurance %" theme={Themes.BLUE}
            ctnClassName={`grow transition-all overflow-clip 
            ${formType == FormOptns.INSURANCE ? "max-w-[200px] pr-1 pl-1" : "max-w-[0px] !pl-0 !pr-0"}`}/>
            <Input theme={Themes.BLUE} id="insuranceRA" type="number" placeholder="Insurance repair accessibility (flux)" 
            ctnClassName={`grow transition-all overflow-clip 
            ${formType == FormOptns.INSURANCE ? "max-w-[350px] pr-1 pl-1" : "max-w-[0px] !pl-0 !pr-0"}`}/>
          </div>
        </div>
        <div className="flex flex-col items-left">
          <Input theme={Themes.BLUE} type="checkbox" id="sortY" 
          onChange={(event:ChangeEvent<HTMLInputElement>) => {setsortY(event.target.checked);}} 
          ctnClassName="cursor-pointer">Sort by Y-coord?</Input>
          <Input theme={repairMode && starterQ ? Themes.RED : Themes.BLUE} type="checkbox" checked={starterQ} id="starterQ" 
          onChange={(event:ChangeEvent<HTMLInputElement>) => {setStarterQ(event.target.checked);}} 
          ctnClassName="cursor-pointer" >From starter?</Input>
          <Input theme={Themes.BLUE} type="checkbox" checked={aExpandoes}id="boxQ" 
          onChange={(event:ChangeEvent<HTMLInputElement>) => {setSnap(event.target.checked);}} 
          ctnClassName="cursor-pointer">Snap boxes?</Input>
        </div>
        <Button theme={Themes.GREEN} className="basis-[min-content]" type="submit">
          <Loader theme={Themes.GREEN} active={processing}></Loader>
          <span>Process</span>
        </Button> 
      </div>
      <div className="flex pt-2 pb-2 gap-2">
        <Input id="firstItems" defaultValue="block, walkway, ladder, net, starter" placeholder={"First items // Use \"quotes\" to match exact"} ctnClassName="grow" theme={Themes.BLUE}/>
        <Input id="lastItems" defaultValue="expando, recycler" placeholder={"Last items // Use \"quotes\" to match exact"} ctnClassName="grow" theme={Themes.BLUE}/>
      </div>
    </form>
    <div className={`${Themes.BLUE.textCls} font-nsm p-2 rounded-md border-[2px]`}>
      {
        // processError ? <span className={Themes.RED.textCls}>{processError}</span> : <></>
      }{
        <>
        {isSort(cmd) ? 
          <div className="grid" style={{gridTemplateColumns:"0fr 1fr"}}>
            <div className="mb-1 grid grid-cols-subgrid gap-2 items-center" style={{gridColumn:"span 2"}}>
              <span>First:</span>
              <div className="summaryContainer flex flex-wrap gap-2 border-[2px]">{itemsToHTML(firstDisp)}</div>
            </div>
            <div className="mt-1 grid grid-cols-subgrid gap-2 items-center" style={{gridColumn:"span 2"}}>
              <span>Last:</span>
              <div className="summaryContainer flex flex-wrap gap-2 border-[2px]">{itemsToHTML(lastDisp)}</div>
            </div>
          </div> : <></>}
        <span className={Themes.GREEN.textCls}>INTERNC: <b>{asyncSumm.width <= 2 ? "N/A" : (asyncSumm.width-2) + "x"+ (asyncSumm.height-2)}</b></span> 
        <p>Cannon dimensions: <b>{(asyncSumm.width/3).toFixed(1)}x{(asyncSumm.height/3).toFixed(1)}</b></p>
        <p>Blueprint width (EXTERNC): &nbsp;<b>{asyncSumm.width}</b> = <b>+{asyncSumm.width < 11 ? "N/A" : asyncSumm.width-11}</b> blocks from starter</p>
        <p>Blueprint height (EXTERNC): <b>{asyncSumm.height}</b> = <b>+{asyncSumm.width <= 8 ? "N/A" : asyncSumm.height-8}</b> blocks from starter</p>
        <p className={asyncSumm.cmdCt > 1000 ? Themes.RED.textCls : ""}>{asyncSumm.cmdCt.toLocaleString()} commands </p>
        <p className={Themes.GREEN.textCls}>RCD cost: <b>{toStackString(asyncSumm.RCDCost)}</b> flux</p> </>
      }
    </div>
    {/* <div className={`summaryContainer outline-[2px] ${Themes.BLUE.textCls} ${Themes.BLUE.bg2}`}> */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 grow-1">
          <p className={Themes.BLUE.textCls}>Sort mode: <b>{cmd}</b> {resBP.length > 1 ? <span className={Themes.RED.textCls + " ml-1"}>Oversize blueprint, split into 2 parts</span> : <></>}</p>
          <div className="flex gap-1">
            <textarea id="outBlueprint" onClick={(event:MouseEvent<HTMLTextAreaElement>)=>{let t = event.target as HTMLTextAreaElement; t.select();}}
              value={resBP[0]} readOnly={true} placeholder="Result blueprint here..."
              className={`grow-1 font-nsm summaryContainer ${Themes.GREY.bgMain} ${Themes.BLUE.textCls} font-nsm p-1 mt-2 rounded-sm`}>
            </textarea>
            <textarea onClick={(event:MouseEvent<HTMLTextAreaElement>)=>{let t = event.target as HTMLTextAreaElement; t.select();}} 
              value={resBP[1] ?? ""} readOnly={true} placeholder="Second blueprint here..."
              className={`${resBP.length > 1 ? "max-w-[400px]" : "max-w-[0px] !p-0" } grow-1 summaryContainer ${Themes.GREY.bgMain} ${Themes.BLUE.textCls} 
              transition-[max-width] overflow-clip font-nsm p-1 mt-2 rounded-sm`}>
            </textarea>
          </div>
        </div>
        <textarea id="outForm" onClick={(event:MouseEvent<HTMLTextAreaElement>)=>{let t = event.target as HTMLTextAreaElement; t.select();}}
          value={outForm} readOnly={true} placeholder="Output form here..."
          className={`grow-1 font-nsm summaryContainer ${Themes.GREY.bgMain} ${Themes.BLUE.textCls} font-nsm p-1 mt-2 rounded-sm`}>
        </textarea>
      </div>
    {/* </div> */}
    {  
      
      <div className={"w-full flex flex-col md:grid gap-1"} style={{gridTemplateColumns:"1fr 1fr"}}>
        {
          processError ? <></> : 
          <div className={`summaryContainer border-[2px] ${Themes.BLUE.textCls} ${Themes.BLUE.bgLight}`}>
            <div className="w-full flex justify-center">
              <p className="text-blue-500 text-lg">Materials required</p>
            </div>
            <div id="resArea">
              <Lister 
                theme={processError ? Themes.RED : Themes.BLUE} 
                className_c="p-2"
                colLayout={processError ? "1fr" : "50px 1fr 9fr"}>{bomSummary}</Lister>
            </div>
          </div>
        }
        {
          processError ? <></> : 
          <div className={`summaryContainer border-[2px] ${Themes.BLUE.textCls} ${Themes.BLUE.bgLight}`}>
            <div className="w-full flex justify-center">
              <p className="text-blue-500 text-lg">Build order&nbsp;
                {starterQ && !processing ? <>{"(adjusted for starter items)"}&nbsp;</> : ""} 
                {repairMode && !processing ? <>{"(adjusted for repair mode)"}&nbsp;</> : ""}
              </p>
            </div>
            <div>
              <Lister 
                theme={Themes.BLUE} 
                className_c="p-2"
                colLayout={"50px 1fr 2fr 9fr"}>{buildSummary}</Lister>
            </div>
          </div>
        }
      </div>
    }
  </div>
  <div id="calcCtn" onClick={(event:MouseEvent<HTMLDivElement>)=>{if ((event.target as HTMLDivElement).id == "calcCtn") setCalcOpen(false);}} 
    className={`w-full h-full fixed bg-gray-200/75 top-0 flex items-center 
    justify-center transition-all ${calcOpen ? "opacity-100 pointer-events-all" : "opacity-0 pointer-events-none"}`}>
    <div className="top-5 w-[90%] h-[fit-content] bg-gray-200 p-3 rounded-md"> 
      <form onSubmit={(event:FormEvent<HTMLFormElement>)=>{event.preventDefault(); runCalc();}} className="flex gap-2">
        <Input id="calc" theme={Themes.BLUE} ctnClassName={`grow font-xl font-nsm ${Themes.BLUE.hoverCls}`} placeholder="Calculate..."/>
        <Button type="submit" theme={Themes.BLUE}><GIcon theme={Themes.BLUE}>calculate</GIcon></Button>
      </form>
      <div>
        <p id="calcRes" className={"p-2 w-full font-nsm " + Themes.BLUE.textCls}>Result: <b>{calcRes}</b></p>
      </div>
    </div>
  </div>
  </div>)
}



