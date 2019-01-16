import {SlangApp} from "../../../slang/app";
import {AppModel} from "../../../slang/model/app";
import {BlackBoxComponent, OperatorBoxComponent} from "../../../slang/ui/components/blackbox";
import {ComponentFactory} from "../../../slang/ui/components/factory";
import {LandscapeModel} from "../../../slang/model/landscape";
import {PaperView} from "../../../slang/ui/views/paper-view";
import {OperatorModel} from "../../../slang/model/operator";
import {BlackBox} from "../../../slang/custom/nodes";
import {PortGroupComponent} from "../../../slang/ui/components/port-group";
import {XY} from "../../../slang/ui/components/base";
import m, {ClassComponent, CVnode} from "mithril";
import {PropertyAssignments, PropertyModel} from "../../../slang/model/property";
import {SlangType, SlangTypeValue} from "../../../slang/custom/type";
import {BlueprintModel} from "../../../slang/model/blueprint";
import {Input} from "../../../slang/ui/components/console";
import {MithrilMouseEvent, Tk} from "../../../slang/ui/components/toolkit";

export class OperatorValueApp extends SlangApp {
	protected readonly blueprintName = "slang.data.Value";

	constructor(app: AppModel, componentFactory: ComponentFactory) {
		super(app, componentFactory);
	}

	protected onReady() {
		const landscape = this.app.getChildNode(LandscapeModel)!;
		const blueprint = landscape.findBlueprint(this.blueprintName);

		if (!blueprint) {
			throw `unknown blueprintName "${this.blueprintName}"`
		}
		this.componentFactory.registerOperatorComponent(blueprint, ValueOperatorComponent);
	}
}

export class ValueOperatorComponent extends OperatorBoxComponent {
	constructor(paperView: PaperView, operator: OperatorModel) {
		super(paperView, operator);
	}

	protected createShape(blackBox: BlackBox, portGroups: Array<PortGroupComponent>): Shape {
		return new Shape(blackBox, portGroups);
	}

	public refresh(): void {
		super.refresh();
	}

}

export class Shape extends BlackBoxComponent.Rect {
	constructor(blackBox: BlackBox, portGroups: Array<PortGroupComponent>, position?: XY) {
		super(blackBox, portGroups, position);
		this.attr("body/rx", 12);
		this.attr("body/ry", 12);
		this.resize(120, 24);
	}
}

interface PropertyFormAttrs {
	operator: OperatorModel
	onSubmit: (propertyAssignments: PropertyAssignments) => void
}

export class PropertyForm implements ClassComponent<PropertyFormAttrs> {
	private blueprint: BlueprintModel | undefined;
	private operator: OperatorModel | undefined;
	private formBody = new Map<string, { initValue: SlangTypeValue, type: SlangType }>();
	private formData = new Map<string, { value: SlangTypeValue }>();

	oninit({attrs}: CVnode<PropertyFormAttrs>): any {
		this.operator = attrs.operator;
		this.blueprint = this.operator.getBlueprint();
		this.formBody = this.getFormBody();
		this.formData = new Map<string, { value: SlangTypeValue }>();
	}

	protected isValid(formData: Map<string, { value: SlangTypeValue }): boolean {
		return true;
	}

	protected getFormBody(): Map<string, { initValue: SlangTypeValue, type: SlangType }> {
		const propertyAssignments = this.operator!.getPropertyAssignments();
		return Array.from(this.blueprint!.getProperties()).reduce((m, property) => {

			const initValue = propertyAssignments.has(property) ? propertyAssignments.get(property).getValue() : undefined;
			const type = property.getType();
			return m.set(property.getName(), {initValue, type});

		}, new Map<string, { initValue: SlangTypeValue, type: SlangType }>());
	}

	protected beforeFormSubmit(formData: Map<string, { value: SlangTypeValue }>): Map<string, { value: SlangTypeValue }> {
		return formData;
	}

	private getFormSubmitData(formData: Map<string, { value: SlangTypeValue }>): PropertyAssignments {
		const propertyAssignments = this.operator!.getPropertyAssignments();
		formData.forEach(({value}, propertyName) => {
			propertyAssignments.assign(propertyName, value);
		});
		return propertyAssignments
	}

	private renderPropertyInput(fieldName: string, fieldAttrs: { type: SlangType, initValue: SlangTypeValue }): m.Children {
		const {type, initValue} = this.formBody.get(fieldName)!;
		return m(Input.ConsoleEntry, {
			label: fieldName, class: "",
			type: type,
			initValue: initValue,
			onInput: (v: any) => {
				this.formData.set(fieldName, v);
			}
		});
	}

	view({attrs}: CVnode<PropertyFormAttrs>): any {
		const blueprint = this.blueprint!;

		return m("form.sl-property.sl-console-in", {
				class: (this.isValid(this.formData) ? "sl-invalid" : "")
			},
			m("h4", `Properties of "${blueprint.getShortName()}"`),
			Array.from(this.formBody.entries()).map(([fieldName, formFieldAttrs]) => {
				return this.renderPropertyInput(fieldName, formFieldAttrs);
			}),
			m(Tk.Button, {
					full: true,
					notAllowed: !this.isValid(this.formData),
					onClick: this.isValid ? (e: MithrilMouseEvent) => {
						attrs.onSubmit(this.getFormSubmitData(this.beforeFormSubmit(this.formData)));
					} : undefined
				}, "Save"
			)
		);
	}
}


export class OperatorPropertyForm extends PropertyForm {
	private propertyAssignments: PropertyAssignments | undefined;
	private blueprint: BlueprintModel | undefined;
	private operator: OperatorModel | undefined;

	protected isValid(): boolean {
		return true;
	}

	private renderPropertyInput(operator: OperatorModel, property: PropertyModel): m.Children {
		const type = property.getType();
		const propName = property.getName();
		return m(Input.ConsoleEntry, {
			label: propName, class: "",
			type: type!,
			initValue: this.propertyAssignments!.has(propName) ? this.propertyAssignments!.get(property).getValue() : undefined,
			onInput: (v: any) => {
				this.propertyAssignments!.assign(propName, v);
			}
		});
	}

	view({attrs}: CVnode<PropertyFormAttrs>): any {
		const operator = this.operator!;
		const blueprint = this.blueprint!;

		return m("form.sl-property.sl-console-in", {
				class: (this.isValid() ? "sl-invalid" : "")
			},
			m("h4", `Properties of "${blueprint.getShortName()}"`),
			Array.from(blueprint.getProperties()).map((property) => {
				return this.renderPropertyInput(operator, property);
			}),
			m(Tk.Button, {
					full: true,
					notAllowed: !this.isValid(),
					onClick: this.isValid ? (e: MithrilMouseEvent) => {
						attrs.onSubmit(this.propertyAssignments!);
					} : undefined
				}, "Save"
			)
		);
	}
}
