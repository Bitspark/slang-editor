// tslint:disable-next-line
import "animate.css/animate.min.css";
// tslint:disable-next-line
import "../styles/tutorial.scss";

import {Subscription} from "rxjs";
import uuidv4 from "uuid/v4";

import {OperatorDataApp} from "../apps/operators/app";
import {SlangAspects} from "../slang/aspects";
import {PortDirection} from "../slang/core/abstract/port";
import {loadBlueprints} from "../slang/core/mapper";
import {AppModel} from "../slang/core/models/app";
import {BlueprintType} from "../slang/core/models/blueprint";
import {LandscapeModel} from "../slang/core/models/landscape";
import {OperatorModel} from "../slang/core/models/operator";
import {OperatorPortModel} from "../slang/core/models/port";
import {BlueprintJson, BlueprintsJson} from "../slang/definitions/api";
import {SlangType} from "../slang/definitions/type";
import {Slang} from "../slang/slang";
import {ViewFrame} from "../slang/ui/frame";

let tutorialLoaded = false;
let balance = 0;
const totalBalance = 20;
const magicOperator = "Magic box";

function checkComplete() {
	const completeEl = document.getElementById("sl-complete")!;
	completeEl.classList.remove("sl-hidden");
	completeEl.classList.add("animated", "bounceInDown");
}

function setBalance(newBalance: number) {
	const balanceEl = document.getElementById("sl-balance")!;
	balanceEl.innerHTML = newBalance.toString();

	const progressEl = document.getElementById("sl-balance-progress")!;
	// tslint:disable-next-line
	progressEl.setAttribute("value", (newBalance * 100 / totalBalance).toString());

	if (newBalance === totalBalance) {
		checkComplete();
	}
}

function getTaskElement(task: string): HTMLElement {
	const tasks = Array.from(document.getElementsByClassName("sl-task")) as HTMLElement[];
	return tasks.find((taskEl) => taskEl.dataset.task === task)!;
}

function checkDone(task: string | null, freeTasks: string[]) {
	if (task) {
		const taskEl = getTaskElement(task);
		taskEl.classList.remove("sl-todo", "animated", "bounceInUp");
		taskEl.classList.add("animated", "tada");
		const radix = 10;
		const credits = Number.parseInt(taskEl.querySelector(".sl-credits")!.innerHTML, radix);
		balance += credits;
		setBalance(balance);
	}

	const singleDelay = 2000;
	freeTasks.forEach((freeTask, index) => {
		const freeTaskEl = getTaskElement(freeTask);
		setTimeout(() => {
			freeTaskEl.classList.remove("sl-hidden");
			freeTaskEl.classList.add("animated", "bounceInUp");
		}, (index + 1) * singleDelay);
	});
}

function registerTask1(appModel: AppModel, done: (subscription: Subscription) => void) {
	const subscription = appModel.subscribeDescendantCreated(OperatorModel, () => {
		if (!tutorialLoaded) {
			return;
		}
		done(subscription);
	});
}

function registerTask2(appModel: AppModel, done: (subscription: Subscription) => void) {
	const operators = new Set<string>();
	const subscription = appModel.subscribeDescendantCreated(OperatorModel, (op) => {
		if (!tutorialLoaded) {
			return;
		}
		operators.add(op.getBlueprint().uuid);
		if (operators.size === 2) {
			done(subscription);
		}
	});
}

function registerTask3(appModel: AppModel, done: (subscription: Subscription) => void) {
	const subscription = new Subscription();
	subscription.add(appModel.subscribeDescendantCreated(OperatorPortModel, (port) => {
		if (!tutorialLoaded) {
			return;
		}
		subscription.add(port.subscribeConnected((other) => {
			if (other instanceof OperatorPortModel) {
				done(subscription);
			}
		}));
	}));
}

function registerTask4(appModel: AppModel, done: (subscription: Subscription) => void) {
	const subscription = new Subscription();
	subscription.add(appModel.subscribeDescendantCreated(OperatorPortModel, (port) => {
		if (!tutorialLoaded) {
			return;
		}
		subscription.add(port.subscribeDisconnected(() => {
			done(subscription);
		}));
	}));
}

function registerTask5(appModel: AppModel, done: (subscription: Subscription) => void) {
	const subscription = new Subscription();
	subscription.add(appModel.subscribeDescendantCreated(OperatorModel, (op) => {
		if (!tutorialLoaded) {
			return;
		}
		subscription.add(op.subscribeDestroyed(() => {
			done(subscription);
		}));
	}));
}

function registerTask6(appModel: AppModel, done: (subscription: Subscription) => void) {
	const subscription = appModel.subscribeDescendantCreated(OperatorModel, (op) => {
		if (!tutorialLoaded) {
			return;
		}
		if (op.getBlueprint().name === magicOperator) {
			done(subscription);
		}
	});
}

function registerTask7(appModel: AppModel, done: (subscription: Subscription) => void) {
	const subscription = new Subscription();
	subscription.add(appModel.subscribeDescendantCreated(OperatorPortModel, (port) => {
		if (!tutorialLoaded) {
			return;
		}
		subscription.add(port.subscribeConnected(() => {
			const owner = port.getOwner();
			if (!(owner instanceof OperatorModel)) {
				return;
			}
			if (owner.getBlueprint().name !== magicOperator) {
				return;
			}
			const ports = owner.getDescendantNodes(OperatorPortModel);
			let connected = 0;
			let unconnected = 0;
			for (const p of ports) {
				if (!p.getType().isPrimitive()) {
					continue;
				}
				if (p.isConnected()) {
					connected++;
				} else {
					unconnected++;
				}
			}
			const currentEl = document.getElementById("task-7-currently")!;
			currentEl.innerHTML = connected.toString();
			if (unconnected === 0 && connected > 0) {
				done(subscription);
			}
		}));
	}));
}

function findDepth(op: OperatorModel, direction: PortDirection): number {
	const ports = op.getDescendantNodes(OperatorPortModel);
	let max = 0;
	for (const port of ports) {
		if (port.getDirection() !== direction || !port.isConnected()) {
			continue;
		}
		for (const other of port.getConnectedWith()) {
			const owner = other.getOwner();
			if (!(owner instanceof OperatorModel)) {
				continue;
			}
			const depth = findDepth(owner, direction) + 1;
			if (depth > max) {
				max = depth;
			}
		}
	}
	return max;
}

function registerTask8(appModel: AppModel, done: (subscription: Subscription) => void) {
	const subscription = new Subscription();
	subscription.add(appModel.subscribeDescendantCreated(OperatorPortModel, (port) => {
		if (!tutorialLoaded) {
			return;
		}
		const owner = port.getOwner();
		if (!(owner instanceof OperatorModel)) {
			return;
		}
		const check = () => {
			const pipelineLength = findDepth(owner, PortDirection.In) + findDepth(owner, PortDirection.Out) + 1;
			const currentEl = document.getElementById("task-8-currently")!;
			currentEl.innerHTML = pipelineLength.toString();
			if (pipelineLength >= 5) {
				done(subscription);
			}
		};
		subscription.add(port.subscribeConnected(check));
		subscription.add(port.subscribeDisconnected(check));
	}));
}

function slangStudioTutorial(elStudio: HTMLElement): Promise<void> {
	return new Promise<void>((resolve) => {
		const appModel = AppModel.create("slang");
		const aspects = new SlangAspects();
		const app = new Slang(appModel);
		const frame = new ViewFrame(elStudio, aspects);
		app.addFrame(frame, true);

		const blueprints: BlueprintsJson = {elementary: [], library: [], local: []};

		for (const el of document.querySelectorAll(`script[type="text/slang"]`)) {
			if (!(el instanceof HTMLScriptElement)) {
				continue;
			}

			const blueprintId = el.dataset.operator as string;
			const blueprintType = el.dataset.type as string;
			const blueprintDef = JSON.parse(el.innerText) as BlueprintJson;

			if (blueprintDef.id !== blueprintId) {
				throw new Error(`blueprint ids don't match: ${blueprintId} !== ${blueprintDef.id}`);
			}

			switch (blueprintType) {
				case "elementary":
					blueprints.elementary.push(blueprintDef);
					break;
				case "library":
					blueprints.library.push(blueprintDef);
					break;
				case "local":
					blueprints.local.push(blueprintDef);
					break;
			}
		}

		loadBlueprints(appModel.getChildNode(LandscapeModel)!, blueprints);

		new OperatorDataApp(appModel, aspects);

		app.load().then(() => {
			registerTask1(appModel, (subscription) => {
				subscription.unsubscribe();
				checkDone("1", ["2"]);
			});
			registerTask2(appModel, (subscription) => {
				subscription.unsubscribe();
				checkDone("2", ["3"]);
			});
			registerTask3(appModel, (subscription) => {
				subscription.unsubscribe();
				checkDone("3", ["4"]);
			});
			registerTask4(appModel, (subscription) => {
				subscription.unsubscribe();
				checkDone("4", ["5"]);
			});
			registerTask5(appModel, (subscription) => {
				subscription.unsubscribe();
				checkDone("5", ["6"]);

				const names = [
					"Bitspark office",
					magicOperator,
					"Magic forest",
					"Magician's suitcase",
					"Small neural net",
					"Email sender",
					"Kai's operator",
					"Taleh's operator",
					"Julian's operator",
				];

				const prefixes = ["Task ", "Simple task ", "Complex task ", "Pipeline ", "AI model ", "Function "];
				const opNumber = 5;
				const portNumber = 2;

				prefixes.forEach((prefixe) => {
					for (let i = 1; i <= opNumber; i++) {
						names.push(prefixe + i);
					}
				});

				const landscapeModel = appModel.getChildNode(LandscapeModel)!;
				names.forEach((name) => {
					const bp = landscapeModel.createBlueprint({
						uuid: uuidv4(),
						type: BlueprintType.Library,
						meta: {name},
					});

					const inType = SlangType.newMap();
					const outType = SlangType.newMap();
					let numInPorts = Math.ceil(Math.random() * portNumber);
					let numOutPorts = Math.ceil(Math.random() * portNumber);

					if (name === magicOperator) {
						numInPorts = 2;
						numOutPorts = 1;
					}

					for (let i = 0; i < numInPorts; i++) {
						inType.addMapSub(i.toString(), SlangType.newRandomPrimitive());
					}

					for (let i = 0; i < numOutPorts; i++) {
						outType.addMapSub(i.toString(), SlangType.newRandomPrimitive());
					}

					bp.createPort({direction: PortDirection.In, type: inType, name: "in"});
					bp.createPort({direction: PortDirection.Out, type: outType, name: "out"});
				});
			});
			registerTask6(appModel, (subscription) => {
				subscription.unsubscribe();
				checkDone("6", ["7", "8"]);
			});
			registerTask7(appModel, (subscription) => {
				subscription.unsubscribe();
				checkDone("7", []);
			});
			registerTask8(appModel, (subscription) => {
				subscription.unsubscribe();
				checkDone("8", []);
			});

			const mainLandscape = appModel.getChildNode(LandscapeModel)!;
			const tutorialBlueprint = mainLandscape.createBlueprint({
				uuid: uuidv4(),
				type: BlueprintType.Local,
				geometry: {size: {width: 800, height: 600}, port: {in: {position: 0}, out: {position: 0}}},
				meta: {name: "Tutorial operator"},
			});
			tutorialBlueprint.open();

			tutorialLoaded = true;

			resolve();

			checkDone(null, ["1"]);
		});

	});
}

(async () => {
	const studioEl = document.getElementById("slang-studio");
	if (studioEl) {
		await slangStudioTutorial(studioEl);
	}
})();
