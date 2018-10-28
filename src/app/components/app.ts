import {LandscapeComponent} from './landscape';
import {BlueprintComponent} from './blueprint';
import {BlueprintType} from '../model/blueprint';
import {Canvas} from '../ui/cavas';
import {AppModel} from '../model/app';

export abstract class PluginComponent {

    protected constructor(protected readonly app: AppModel) {
    }

}

export class MainComponent extends PluginComponent {
    private landscapeComponent: LandscapeComponent | null = null;
    private canvas: Canvas;

    constructor(app: AppModel, private el: HTMLElement) {
        super(app);

        const that = this;
        window.addEventListener('resize', function () {
            that.resize();
        });
        window.addEventListener('load', function () {
            that.resize();
        });
        
        this.subscribe();
    }

    private subscribe(): void {
        this.app.subscribeOpenedBlueprintChanged(blueprint => {
            if (blueprint !== null) {
                new BlueprintComponent(this.canvas.getGraph(), blueprint);
                
                this.canvas.getPaper().scaleContentToFit({preserveAspectRatio: true});
                const scale = Math.min(1.0, this.canvas.getPaper().scale().sx * 0.8);
                this.canvas.getPaper().scale(scale);
                this.canvas.center();
            }
        });

        this.app.subscribeOpenedLandscapeChanged(landscape => {
            if (landscape !== null) {
                this.canvas.reset();
                // TODO: Destroy
                this.landscapeComponent = new LandscapeComponent(this.canvas.getGraph(), landscape, bp => bp.getType() === BlueprintType.Local);
                this.landscapeComponent.resize(this.canvas.getWidth(), this.canvas.getHeight());
            }
        });
    }
    
    public async load(): Promise<void> {
        this.canvas = new Canvas(this.el);
        return this.app.load();
    }

    public resize() {
        this.canvas.resize(this.el.clientWidth, this.el.clientHeight);
        if (this.landscapeComponent) {
            this.landscapeComponent.resize(this.canvas.getWidth(), this.canvas.getHeight());
        }
    }
}