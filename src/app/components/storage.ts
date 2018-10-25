import {LandscapeModel} from "../model/landscape";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {ApiService, BlueprintApiResponse, BlueprintDefApiResponse} from "../services/api";
import {OperatorModel} from "../model/operator";

export class StorageComponent {
    constructor(private landscape: LandscapeModel, private api: ApiService) {

    }

    public async load(): Promise<void> {
        const bpDataList: Array<BlueprintApiResponse> = await this.api.getBlueprints();
        return new Promise<void>(resolve => {

            const blueprintToOperator = new Map<BlueprintModel, BlueprintDefApiResponse>();

            // 1) Add Blueprints
            bpDataList.forEach(bpData => {
                const type: BlueprintType | null = ({
                    local: BlueprintType.Local,
                    library: BlueprintType.Library,
                    elementary: BlueprintType.Elementary,
                } as any)[bpData.type];

                if (type === null) {
                    throw `unknown blueprint type '${bpData.type}'`;
                }

                const bp = new BlueprintModel(bpData.name, type);
                this.landscape.addBlueprint(bp);

                blueprintToOperator.set(bp, bpData.def);
            });

            // 2) Add Operators. Use previously defined Blueprints for assigning Operator.blueprint
            blueprintToOperator.forEach((bpDef: BlueprintDefApiResponse, outerBlueprint: BlueprintModel) => {
                if (bpDef.operators) {
                    const opObj = (bpDef.operators as any);
                    Object.keys(opObj).forEach((opName: string) => {
                        const opData = opObj[opName];
                        const blueprint = this.landscape.findBlueprint(opData.operator);

                        if (blueprint == undefined) {
                            throw `unknown blueprint '${opObj.operator}'`;
                        }

                        const op = new OperatorModel(opName, blueprint);
                        outerBlueprint.addOperator(op);
                    });
                }
            });

            resolve();
        });
    }
}