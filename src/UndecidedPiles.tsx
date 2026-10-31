import {useDraggable,useDroppable} from '@dnd-kit/core';
import {ArrowUpRight,Grip,Layers,Plus,Undo2} from 'lucide-react';
import type {Activity,Game} from './model';
import {heldIds} from './piles';

interface Props {game:Game;onInspect:(index:number)=>void;onReturn:(id:string)=>void;onPlace:(a:Activity)=>void}
export function UndecidedPiles(props:Props){
 return <section className="undecided-section" aria-label="UNDECIDED — Za pozneje">
  <div className="section-heading"><h2><Layers size={15}/>UNDECIDED <span data-testid="undecided-total">{heldIds(props.game).length}</span></h2></div>
  <p className="section-caption">Za pozneje · 8 kupčkov, neomejeno možnosti.</p>
  <div className="undecided-grid">{props.game.undecided.piles.map((ids,index)=><UndecidedPile key={index} {...props} index={index} ids={ids}/>)}</div>
 </section>;
}
function UndecidedPile({game,index,ids,onInspect,onReturn,onPlace}:Props&{index:number;ids:string[]}){
 const {setNodeRef,isOver}=useDroppable({id:`undecided-pile-${index}`});
 // Only the last six layers are painted. All cards remain in the uncapped state.
 const visible=ids.slice(-6),spread=Math.max(0,visible.length-1)*10;
 const a=game.activities.find(a=>a.id===ids.at(-1));
 return <div id={`undecided-pile-${index}`} className={'undecided-pile '+(isOver?'pile-over':'')} ref={setNodeRef} data-testid={`undecided-pile-${index}`} data-count={ids.length}>
  <div className="pile-heading"><button aria-label={`Preglej kupček ${index+1}`} onClick={()=>onInspect(index)}>Kupček {index+1}<ArrowUpRight size={11}/></button><span aria-label={`${ids.length} kartic`} data-testid={`pile-count-${index}`}>{ids.length}</span></div>
  <div className="pile-surface" style={{height:148+spread}}>
   {!a?<div className="pile-placeholder"><Plus size={22}/><span>Položi kartico sem</span></div>:<>
    {visible.slice(0,-1).map((id,i)=>{const card=game.activities.find(a=>a.id===id)!;return <div className="pile-under-card" key={id} aria-hidden="true" style={{top:i*10,zIndex:i,filter:`brightness(${.68+i*.045})`}}><span>{card.title}</span></div>})}
    <PileTop key={a.id} a={a} index={index} offset={spread} onInspect={()=>onInspect(index)} onReturn={()=>onReturn(a.id)} onPlace={()=>onPlace(a)}/>
   </>}
   {isOver&&<div className="pile-landing" aria-hidden="true"><Plus size={16}/>Na vrh kupčka</div>}
  </div>
 </div>;
}
function PileTop({a,index,offset,onInspect,onReturn,onPlace}:{a:Activity;index:number;offset:number;onInspect:()=>void;onReturn:()=>void;onPlace:()=>void}){
 const {setNodeRef,attributes,listeners,isDragging}=useDraggable({id:`undecided-card-${index}`});
 return <article ref={setNodeRef} className={'pile-top-card '+(isDragging?'dragging':'')} style={{top:offset}} data-activity-id={a.id}>
  <div className="pile-card-meta"><span>{a.city||a.category}</span><button className="pile-grip" aria-label={`Povleci vrhnjo kartico kupčka ${index+1}: ${a.title}`} {...attributes} {...listeners}><Grip size={17}/></button></div>
  <button className="pile-card-title" onClick={onInspect}>{a.title}</button>
  <span className="pile-card-duration">{a.duration} min · {a.booking==='booked'?'Rezervirano':a.booking==='confirmed'?'Potrjeno':'Preverite urnik'}</span>
  <div className="pile-card-actions"><button aria-label={`Izberi termin: ${a.title}`} onClick={onPlace}>Na ploščo <ArrowUpRight size={12}/></button><button aria-label={`Vrni vrhnjo kartico kupčka ${index+1} na kupček`} onClick={onReturn} title="Vrni na glavni kupček"><Undo2 size={14}/></button></div>
 </article>;
}
