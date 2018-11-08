import {dia} from "jointjs";

export function addClassToLink(link: dia.Link, selector: string, ...classes: Array<string>) {
    // rather hacky, but JoinJS doesn't allow for it in case of links
    
    let el = document.querySelector(`[model-id="${link.id}"]`);
    if (!el) {
        throw new Error(`could not find cell dom element: ${this.id}`);
    }
    if (selector) {
        el = el.querySelector(`.connection`);
        if (!el) {
            throw new Error(`could not find dom element: ${this.id}, selector: ${selector}`);
        }
    }
    
    el.classList.add(...classes);
}