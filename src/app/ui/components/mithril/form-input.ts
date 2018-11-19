import m, {ClassComponent, CVnode} from "mithril";

export interface MithrilMouseEvent extends MouseEvent {
	redraw: boolean
}

export namespace FormInput {
	interface Attrs {
		cssSelector: string,
		inputType: string
	}


	class Base implements ClassComponent<Attrs> {
		constructor(protected readonly cssSelector: string, protected readonly inputType: string) {
		}

		view({attrs}: CVnode<Attrs>) {
			return m(this.cssSelector, {type: this.inputType});
		}
	}

	export class Text extends Base {
		constructor() {
			super("input.sl-inp.text", "text");
		}
	}

	export class Number extends Base {
		constructor() {
			super("input.sl-inp.number", "number");
		}
	}

	export class Boolean extends Base {
		constructor() {
			super("input.sl-inp.bool", "checkbox");
		}
	}

	export class Trigger extends Base {
		constructor() {
			super("input.sl-inp.trig", "button");
		}
	}


}

