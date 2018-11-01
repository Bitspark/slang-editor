import {attributes, dia, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {PortModel} from "../../model/port";
import {PortComponent, PortGroupComponent, PortGroupPosition} from "./port";
import {SlangType} from "../../model/type";


function createPortItems(group: string, position: PortGroupPosition, port: PortModel): Array<PortComponent> {
    let portItems: Array<PortComponent> = [];

    switch (port.getType()) {
        case SlangType.Map:
            for (const [_, each] of port.getMapSubs()) {
                portItems.push.apply(portItems, createPortItems(group, position, each));
            }
            break;

        case SlangType.Stream:
            portItems.push.apply(portItems, createPortItems(group, position, port.getStreamSub()));
            break;

        default:
            portItems.push(new PortComponent(port, group, position));
    }
    return portItems;
}

export class BlackBoxComponent extends shapes.standard.Rectangle.define('BlackBox', {}) {

    constructor(blackBox: BlackBox) {
        const identity = blackBox.getIdentity();
        const portGroups = BlackBoxComponent.createGroups(blackBox);
        const portItems = BlackBoxComponent.createPorts(blackBox);

        super({
            id: identity,
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: BlackBoxComponent.blueprintAttrs,
                label: {
                    text: blackBox.getDisplayName(),
                    fill: "white",
                },
            },
            ports: {
                groups: portGroups,
                items: portItems
            }
        } as any);
    }

    private static createPorts(blackBox: BlackBox): Array<PortComponent> {
        let portItems: Array<PortComponent> = [];

        const inPort = blackBox.getPortIn();
        if (inPort) {
            portItems.push.apply(portItems, createPortItems("MainIn", "top", inPort));
        }

        const outPort = blackBox.getPortOut();
        if (outPort) {
            portItems.push.apply(portItems, createPortItems("MainOut", "bottom", outPort));
        }

        for (const delegate of blackBox.getDelegates()) {
            if (delegate.getPortOut()) {
                portItems.push.apply(portItems, createPortItems(`Delegate${delegate.getName()}Out`, "right", delegate.getPortOut()!));
            }
            if (delegate.getPortIn()) {
                portItems.push.apply(portItems, createPortItems(`Delegate${delegate.getName()}In`, "right", delegate.getPortIn()!));
            }
        }

        return portItems;
    }

    private static createGroups(blackBox: BlackBox): { [key: string]: dia.Element.PortGroup } {
        const portGroups: { [key: string]: dia.Element.PortGroup } = {
            "MainIn": new PortGroupComponent(blackBox.getPortIn()!, "top", 0.0, 1.0),
            "MainOut": new PortGroupComponent(blackBox.getPortOut()!, "bottom", 0.0, 1.0)
        };

        const delegates = Array.from(blackBox.getDelegates());

        const width = 0.5 / delegates.length;
        const step = 0.5 / delegates.length;
        let pos = 0;
        for (const delegate of delegates) {
            portGroups[`Delegate${delegate.getName()}Out`] = new PortGroupComponent(delegate.getPortOut()!, "right", pos, width);
            pos += step;
            portGroups[`Delegate${delegate.getName()}In`] = new PortGroupComponent(delegate.getPortIn()!, "right", pos, width);
            pos += step;
        }

        return portGroups;
    }

    private static blueprintAttrs: attributes.SVGAttributes = {
        fill: "blue",
        stroke: "black",
        strokeWidth: 1,
        rx: 6,
        ry: 6,
    };

}

export class IsolatedBlueprintPort extends shapes.standard.Rectangle.define('IsolatedPort', {}) {

    constructor(identity: string, port: PortModel, position: PortGroupPosition) {        
        const portGroups = {"PortGroup": new PortGroupComponent(port, position, 0, 1.0)};
        const portItems = createPortItems("PortGroup", position, port);

        super({
            id: identity,
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: {
                    fill: "yellow",
                    stroke: "black",
                    strokeWidth: 1,
                    rx: 6,
                    ry: 6,
                },
            },
            ports: {
                groups: portGroups,
                items: portItems
            }
        } as any);
    }

}