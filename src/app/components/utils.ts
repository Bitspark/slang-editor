import {dia} from "jointjs";

/**
 * Passes events triggered on a paper to the according cells.
 * @param paper to redirect events for
 */
export function redirectPaperEvents(paper: dia.Paper) {
    ['mousewheel'].forEach(event => {
        (function (event) {
            paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event, x: number, y: number, delta: number) {
                cellView.model.trigger(event, evt, x, y, delta);
            });
        })(event);
    });

    ['pointerdblclick', 'pointerclick', 'contextmenu', 'pointerdown', 'pointermove', 'pointerup'].forEach(event => {
        (function (event) {
            paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event, x: number, y: number) {
                cellView.model.trigger(event, evt, x, y);
            });
        })(event);
    });

    ['mouseover', 'mouseout', 'mouseenter', 'mouseleave'].forEach(event => {
        (function (event) {
            paper.on('cell:' + event, function (cellView: dia.CellView, evt: Event) {
                cellView.model.trigger(event, evt);
            });
        })(event);
    });
}
