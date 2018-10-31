import {attributes, dia, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {PortModel} from "../../model/port";
import {PortComponent, PortDirection, PortGroupComponent} from "./port";
import {SlangType} from "../../model/type";

export class BlackBoxComponent extends shapes.standard.Rectangle {
    
    constructor(blackBox: BlackBox) {        
        super({
            id: blackBox.getIdentity(),
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: BlackBoxComponent.blueprintAttrs,
                label: {
                    text: blackBox.getDisplayName(),
                    fill: 'white',
                },
            },
            ports: {
                groups: BlackBoxComponent.createGroups(blackBox),
                items: BlackBoxComponent.createPorts(blackBox),
            }
        });
    }
    
    private static createPorts(blackBox: BlackBox): Array<PortComponent> {       
        let portItems: Array<PortComponent> = [];

        const inPort = blackBox.getPortIn();
        if (inPort) {
            portItems.push.apply(portItems, BlackBoxComponent.createPortItems("MainIn", inPort))
        }

        const outPort = blackBox.getPortOut();
        if (outPort) {
            portItems.push.apply(portItems, BlackBoxComponent.createPortItems("MainOut", outPort))
        }

        for (const delegate of blackBox.getDelegates()) {
            if (delegate.getPortOut()) {
                portItems.push.apply(portItems, BlackBoxComponent.createPortItems(`Delegate${delegate.getName()}Out`, delegate.getPortOut()!));
            }
            if (delegate.getPortIn()) {
                portItems.push.apply(portItems, BlackBoxComponent.createPortItems(`Delegate${delegate.getName()}In`, delegate.getPortIn()!));
            }
        }
        
        return portItems;
    }
    
    private static createGroups(blackBox: BlackBox): { [key: string]: dia.Element.PortGroup} {
        const portGroups: { [key: string]: dia.Element.PortGroup} = {
            'MainIn': new PortGroupComponent(blackBox, PortDirection.In, 0.0, 1.0),
            'MainOut': new PortGroupComponent(blackBox, PortDirection.Out, 0.0, 1.0)
        };
        
        const delegates = Array.from(blackBox.getDelegates());
        
        const width = 0.5 / delegates.length;
        const step = 0.5 / delegates.length;
        let pos = 0;
        for (const delegate of delegates) {
            portGroups[`Delegate${delegate.getName()}Out`] = new PortGroupComponent(delegate, PortDirection.Out, pos, width);
            pos += step;
            portGroups[`Delegate${delegate.getName()}In`] = new PortGroupComponent(delegate, PortDirection.In, pos, width);
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

    private static createPortItems(group: string, port: PortModel): Array<PortComponent> {
        let portItems: Array<PortComponent> = [];

        switch (port.getType()) {
            case SlangType.Map:
                for (const [_, each] of port.getMapSubs()) {
                    portItems.push.apply(portItems, this.createPortItems(group, each));
                }
                break;

            case SlangType.Stream:
                portItems.push.apply(portItems, this.createPortItems(group, port.getStreamSub()));
                break;

            default:
                portItems.push(new PortComponent(port, group));
        }
        return portItems;
    }

}