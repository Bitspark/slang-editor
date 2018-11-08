import {TypeIdentifier} from "../app/custom/type";

export namespace Styles {

    const TypeColors: { [key in TypeIdentifier]: string } = {
        [TypeIdentifier.Number]: "blue",
        [TypeIdentifier.String]: "brown",
        [TypeIdentifier.Boolean]: "orange",
        [TypeIdentifier.Binary]: "yellow",
        [TypeIdentifier.Primitive]: "darkcyan",
        [TypeIdentifier.Trigger]: "gray",
        [TypeIdentifier.Generic]: "violet",
        [TypeIdentifier.Stream]: "transparent",
        [TypeIdentifier.Map]: "transparent",
    };
    
    export class Port {
        public static width = 7;
        public static height = 21;
        public static shape = 
            `M ${-Port.width / 2} ${-Port.height / 2} ` +
            `L ${Port.width / 2} ${-Port.height / 2} ` +
            `L 0 ${Port.height / 2} z`
    }
    
    export namespace Connection {
        class Connection {
            public static strokeWidth = 3;
            public static stroke = (type: TypeIdentifier): string => TypeColors[type];
        }
        
        export class Ordinary extends Connection {
            public static strokeOpacity = 1;
            
        }
        export class Ghost extends Connection {
            public static strokeOpacity = 0.5;
        }
    }
    
    export class PortGroup {
        public static transformations = {
            "top": "",
            "right": "translate(-40 0)",
            "bottom": "",
            "left": "translate(40 0)",
        };
    }

    export class Blackbox {
        public static rx = 6;
        public static ry = 6;
        public static size = { width: 100, height: 100 };
    }

    export class Outer {
        public static rx = 24;
        public static ry = 24;
    }

}