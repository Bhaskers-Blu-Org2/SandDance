// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { base } from './base';
import { deepCompare } from './util';
import { specs, types, VegaDeckGl, Viewer } from '@msrvida/sanddance';

export interface Props {
    viewerOptions?: Partial<types.ViewerOptions>;
    insight: specs.Insight;
    data: object[];
    renderOptions?: types.RenderOptions;
    onView?: (renderResult: types.RenderResult) => void;
    onError?: (error: any) => void;
    onMount?: (element: HTMLElement) => boolean | void;
}

export interface State {
}

function addNullable(insight: specs.Insight, signalValues: specs.SignalValues) {
    const withNulls: specs.Insight = { view: null, filter: null, ...insight, signalValues };
    return withNulls;
}

function _SandDanceReact(props: Props) {

    class __SandDanceReact extends base.react.Component<Props, State> {
        public viewer: Viewer;
        private viewerDiv: React.ReactInstance;
        private lastData: object[];

        private areLayoutPropsSame() {
            const currentInsight = this.viewer.getInsight();
            const a = addNullable(currentInsight, { ...this.viewer.insight.signalValues, ...currentInsight.signalValues });
            const b = addNullable(this.props.insight, { ...a.signalValues, ...this.props.insight.signalValues });
            const compare = deepCompare(a, b);
            return compare && (this.props.data === this.lastData);
        }

        private needsLayout() {
            return this.props.insight && this.props.data && !this.areLayoutPropsSame();
        }

        private layout() {
            this.lastData = this.props.data;
            this.viewer.render(
                this.props.insight,
                this.props.data,
                this.props.renderOptions
            ).then(renderResult => {
                //TODO: show errors if any
                //console.log('viewer render');
                this.props.onView && this.props.onView(renderResult);
            }).catch(e => {
                //console.log('viewer error');
                this.props.onError && this.props.onError(e);
            });
        }

        private view() {
            const needsLayout = this.needsLayout();
            if (needsLayout) {
                this.layout();
            }
        }

        componentDidMount() {
            const element = base.reactDOM.findDOMNode(this.viewerDiv) as HTMLElement;
            this.viewer = new Viewer(element, this.props.viewerOptions);
            if (this.props.onMount) {
                if (this.props.onMount(this.viewer.presenter.getElement(VegaDeckGl.PresenterElement.gl))) {
                    this.view();
                }
            } else {
                this.view();
            }
        }

        componentDidUpdate() {
            this.viewer.options = VegaDeckGl.util.deepMerge(this.viewer.options, this.props.viewerOptions) as types.ViewerOptions;
            this.view();
        }

        componentWillUnmount() {
            this.viewer.finalize();
        }

        render() {
            return (
                <div className="sanddance-ReactViewer" ref={div => (this.viewerDiv = div)} />
            );
        }
    }

    return new __SandDanceReact(props);
}

export const SandDanceReact: typeof SandDanceReact_Class = _SandDanceReact as any;

export declare class SandDanceReact_Class extends base.react.Component<Props, State> {
    public viewer: Viewer;
}
