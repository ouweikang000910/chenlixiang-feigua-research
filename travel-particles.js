(() => {
  'use strict';
  const root = document.documentElement;
  const ns = 'http://www.w3.org/2000/svg';
  const hosts = [...document.querySelectorAll('.hero,.report-portals,.section,.travel-interlude')];
  const fields = [];
  const pointer = { x:0, y:0, active:false };
  const radius = 205;
  let pendingFrame = 0;
  let resizeFrame = 0;
  let current = null;
  const enabled = () => root.dataset.motion !== 'off' && !document.hidden;
  function random(seed) {
    let state = seed >>> 0;
    return () => { state = (Math.imul(state,1664525)+1013904223)>>>0; return state/4294967296; };
  }
  function clear(field) {
    if (!field) return;
    field.svg.classList.remove('is-connected');
    field.svg.dataset.linkCount = '0';
    field.active.forEach(point => point.element.classList.remove('is-near'));
    field.active = [];
  }
  function build(field) {
    clear(field);
    const width = document.documentElement.clientWidth;
    const height = Math.max(1,field.host.offsetHeight);
    const step = width < 600 ? 106 : 126;
    const columns = Math.ceil(width/step);
    const rows = Math.ceil(height/step);
    const rng = random(8107+field.index*1439);
    field.width = width;
    field.height = height;
    field.svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    field.svg.replaceChildren(field.path);
    field.points = [];
    for (let row=0;row<rows;row++) {
      for (let column=0;column<columns;column++) {
        const x = Math.min(width-8,(column+.18+rng()*.68)*step);
        const y = Math.min(height-8,(row+.18+rng()*.68)*step);
        const element = document.createElementNS(ns,'circle');
        element.setAttribute('class','particle-dot');
        element.setAttribute('cx',x.toFixed(1));
        element.setAttribute('cy',y.toFixed(1));
        element.setAttribute('r',(1.35+rng()*.85).toFixed(2));
        field.svg.append(element);
        field.points.push({x,y,element});
      }
    }
    field.svg.dataset.particleCount = String(field.points.length);
  }
  hosts.forEach((host,index) => {
    const svg = document.createElementNS(ns,'svg');
    svg.setAttribute('class','particle-field');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('preserveAspectRatio','none');
    const path = document.createElementNS(ns,'path');
    path.setAttribute('class','particle-links');
    host.prepend(svg);
    const field = {host,index,svg,path,points:[],active:[]};
    fields.push(field);
    build(field);
  });
  function render() {
    pendingFrame = 0;
    if (!enabled() || !pointer.active) { clear(current); current=null; return; }
    let found = null;
    let localY = 0;
    for (const field of fields) {
      const rect = field.host.getBoundingClientRect();
      if (pointer.y >= rect.top && pointer.y < rect.bottom) { found=field;localY=pointer.y-rect.top;break; }
    }
    if (found !== current) { clear(current);current=found; }
    if (!found) return;
    const near = found.points.map(point => ({point,distance:Math.hypot(point.x-pointer.x,point.y-localY)}))
      .filter(item => item.distance<radius).sort((a,b)=>a.distance-b.distance).slice(0,12).map(item=>item.point);
    let edges = [];
    for (let i=0;i<near.length;i++) {
      for (let j=i+1;j<near.length;j++) {
        if (Math.hypot(near[i].x-near[j].x,near[i].y-near[j].y)<182) edges.push([near[i],near[j]]);
      }
    }
    edges = edges.slice(0,24);
    clear(found);
    if (!edges.length) return;
    const linked = [...new Set(edges.flat())];
    linked.forEach(point => point.element.classList.add('is-near'));
    found.active = linked;
    found.path.setAttribute('d',edges.map(([a,b])=>`M${a.x.toFixed(1)},${a.y.toFixed(1)}L${b.x.toFixed(1)},${b.y.toFixed(1)}`).join(''));
    found.svg.dataset.linkCount = String(edges.length);
    found.svg.classList.add('is-connected');
  }
  function schedule() { if (!pendingFrame) pendingFrame=requestAnimationFrame(render); }
  document.addEventListener('pointermove',event => {
    if (event.pointerType==='touch') return;
    pointer.x=event.clientX;pointer.y=event.clientY;pointer.active=true;
    schedule();
  },{passive:true});
  const leave = () => { pointer.active=false;clear(current);current=null; };
  document.addEventListener('pointerleave',leave);
  window.addEventListener('blur',leave);
  window.addEventListener('scroll',() => { if (pointer.active) schedule(); },{passive:true});
  document.addEventListener('visibilitychange',() => { if (document.hidden) leave(); });
  document.addEventListener('travel-motion-change',() => { if (!enabled()) leave(); });
  const rebuild = () => {
    if (resizeFrame) return;
    resizeFrame=requestAnimationFrame(() => {
      resizeFrame=0;
      fields.forEach(field => {
        if (field.width!==document.documentElement.clientWidth || field.height!==field.host.offsetHeight) build(field);
      });
      schedule();
    });
  };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(rebuild);
    hosts.forEach(host=>observer.observe(host));
  } else { window.addEventListener('resize',rebuild); }
})();
