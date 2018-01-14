import {h} from 'preact'
import {StyleSheet, css} from 'aphrodite'
import {ReloadableComponent} from './reloadable'

import {importFromBGFlameGraph} from './import/bg-flamegraph'
import {importFromStackprof} from './import/stackprof'
import {importFromChromeTimeline, importFromChromeCPUProfile} from './import/chrome'

import {Profile, Frame} from './profile'
import {Flamechart} from './flamechart'
import { FlamechartView } from './flamechart-view'
import { CallGraphView } from './call-graph-view'
import { FontFamily, FontSize, Colors } from './style'
import { FrameColorGenerator } from './color'

const enum ViewMode {
  CHRONO_FLAMECHART,
  LEFT_HEAVY_FLAMECHART,
  CALL_GRAPH
}

interface ApplicationState {
  profile: Profile | null
  flamechart: Flamechart | null
  sortedFlamechart: Flamechart | null
  viewMode: ViewMode
}

interface ToolbarProps extends ApplicationState {
  setSortOrder(order: ViewMode): void
}

export class Toolbar extends ReloadableComponent<ToolbarProps, void> {
  setTimeOrder = () => {
    this.props.setSortOrder(ViewMode.CHRONO_FLAMECHART)
  }

  setLeftHeavyOrder = () => {
    this.props.setSortOrder(ViewMode.LEFT_HEAVY_FLAMECHART)
  }

  render() {
    const help = (
      <div className={css(style.toolbarTab)}>
        <a href="https://github.com/jlfwong/speedscope#usage" className={css(style.noLinkStyle)} target="_blank">
          <span className={css(style.emoji)}>❓</span>Help
        </a>
      </div>
    )

    if (!this.props.profile) {
      return <div className={css(style.toolbar)}>
        <div className={css(style.toolbarLeft)}>{help}</div>
        🔬speedscope
      </div>
    }
    return <div className={css(style.toolbar)}>
      <div className={css(style.toolbarLeft)}>
        <div className={css(style.toolbarTab, this.props.viewMode === ViewMode.CHRONO_FLAMECHART && style.toolbarTabActive)} onClick={this.setTimeOrder}>
          <span className={css(style.emoji)}>🕰</span>Time Order
        </div>
        <div className={css(style.toolbarTab, this.props.viewMode === ViewMode.LEFT_HEAVY_FLAMECHART && style.toolbarTabActive)} onClick={this.setLeftHeavyOrder}>
          <span className={css(style.emoji)}>⬅️</span>Left Heavy
        </div>
        {help}
      </div>
      {this.props.profile.getName()}
      <div className={css(style.toolbarRight)}>🔬speedscope</div>
    </div>
  }
}

export class Application extends ReloadableComponent<{}, ApplicationState> {
  constructor() {
    super()
    this.state = {
      profile: null,
      flamechart: null,
      sortedFlamechart: null,
      viewMode: ViewMode.CHRONO_FLAMECHART
    }
  }

  importJSON(parsed: any): Profile {
    if (Array.isArray(parsed) && parsed[parsed.length - 1].name === "CpuProfile") {
      return importFromChromeTimeline(parsed)
    } else {
      return importFromStackprof(parsed)
    }
  }

  loadFromString(fileName: string, contents: string) {
    console.time('import')
    console.log(fileName)
    const profile =
      fileName.endsWith('json') ? this.importJSON(JSON.parse(contents))
        : fileName.endsWith('cpuprofile') ? importFromChromeCPUProfile(JSON.parse(contents))
        : importFromBGFlameGraph(contents)
    profile.setName(fileName)
    document.title = `${fileName} - speedscope`

    const frames: Frame[] = []
    profile.forEachFrame(f => frames.push(f))
    const colorGenerator = new FrameColorGenerator(frames)

    const flamechart = new Flamechart({
      getTotalWeight: profile.getTotalWeight.bind(profile),
      forEachCall: profile.forEachCall.bind(profile),
      formatValue: profile.formatValue.bind(profile),
      getColorForFrame: colorGenerator.getColorForFrame.bind(colorGenerator)
    })

    const sortedFlamechart = new Flamechart({
      getTotalWeight: profile.getTotalNonIdleWeight.bind(profile),
      forEachCall: profile.forEachCallGrouped.bind(profile),
      formatValue: profile.formatValue.bind(profile),
      getColorForFrame: colorGenerator.getColorForFrame.bind(colorGenerator)
    })

    this.setState({ profile, flamechart, sortedFlamechart }, () => {
      console.timeEnd('import')
    })
  }

  loadFromFile(file: File) {
    const reader = new FileReader
    reader.addEventListener('loadend', () => {
      this.loadFromString(file.name, reader.result)
    })
    reader.readAsText(file)
  }

  loadExample = () => {
    fetch('dist/perf-vertx-stacks-01-collapsed-all.txt').then(resp => resp.text()).then(data => {
      this.loadFromString('perf-vertx-stacks-01-collapsed-all.txt', data)
    })
  }

  onDrop = (ev: DragEvent) => {
    this.loadFromFile(ev.dataTransfer.files.item(0))
    ev.preventDefault()
  }

  onDragOver = (ev: DragEvent) => {
    ev.preventDefault()
  }

  onWindowKeyPress = (ev: KeyboardEvent) => {
    if (ev.key === '1') {
      this.setState({
        viewMode: ViewMode.CHRONO_FLAMECHART
      })
    } else if (ev.key === '2') {
      this.setState({
        viewMode: ViewMode.LEFT_HEAVY_FLAMECHART
      })
    } else if (ev.key === '3') {
      this.setState({
        viewMode: ViewMode.CALL_GRAPH
      })
    }
  }

  componentDidMount() {
    window.addEventListener('keypress', this.onWindowKeyPress)
  }

  componentWillUnmount() {
    window.removeEventListener('keypress', this.onWindowKeyPress)
  }

  flamechartView: FlamechartView | null = null
  flamechartRef = (view: FlamechartView | null) => this.flamechartView = view
  callgraphView: CallGraphView | null = null
  callgraphRef = (view: CallGraphView | null) => this.callgraphView = view
  subcomponents() {
    return {
      flamechart: this.flamechartView,
      callgraph: this.callgraphView
    }
  }

  onFileSelect = (ev: Event) => {
    this.loadFromFile((ev.target as HTMLInputElement).files!.item(0))
  }

  renderLanding() {
    return <div className={css(style.landingContainer)}>
      <div className={css(style.landingMessage)}>
        <p className={css(style.landingP)}>👋 Hi there! Welcome to 🔬speedscope, an interactive{' '}
        <a className={css(style.link)} href="http://www.brendangregg.com/FlameGraphs/cpuflamegraphs.html">flamegraph</a> visualizer.
        Use it to help you make your software faster.</p>
        <p className={css(style.landingP)}>Drag and drop a profile file onto this window to get started,
        click the big blue button below to browse for a profile to explore, or{' '}
          <a className={css(style.link)} onClick={this.loadExample}>click here</a>{' '}
          to load an example profile.</p>

        <div className={css(style.browseButtonContainer)}>
          <input type="file" name="file" id="file" onChange={this.onFileSelect} className={css(style.hide)} />
          <label for="file" className={css(style.browseButton)}>Browse</label>
        </div>

        <p className={css(style.landingP)}>See the <a className={css(style.link)}
          href="https://github.com/jlfwong/speedscope#usage" target="_blank">documentation</a> for
        information about supported file formats, keyboard shortcuts, and how
        to navigate around the profile.</p>

        <p className={css(style.landingP)}>speedscope is open source.
        Please <a className={css(style.link)} target="_blank" href="https://github.com/jlfwong/speedscope/issues">report any issues on GitHub</a>.</p>
      </div>
    </div>
  }

  setViewMode = (viewMode: ViewMode) => {
    this.setState({ viewMode })
  }

  render() {
    const { flamechart, sortedFlamechart, viewMode } = this.state
    let contentView: JSX.Element | null = null

    switch (viewMode) {
      case ViewMode.CHRONO_FLAMECHART: {
        if (flamechart) {
          contentView = <FlamechartView ref={this.flamechartRef} flamechart={flamechart} />
        }
        break
      }

      case ViewMode.LEFT_HEAVY_FLAMECHART: {
        if (sortedFlamechart) {
          contentView = <FlamechartView ref={this.flamechartRef} flamechart={sortedFlamechart} />
        }
        break
      }

      case ViewMode.CALL_GRAPH: {
        contentView = <CallGraphView ref={this.callgraphRef} />
        break
      }
    }

    return <div onDrop={this.onDrop} onDragOver={this.onDragOver} className={css(style.root)}>
      <Toolbar setSortOrder={this.setViewMode} {...this.state} />
      {contentView || this.renderLanding()}
    </div>
  }
}

const style = StyleSheet.create({
  root: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    fontFamily: FontFamily.MONOSPACE,
    lineHeight: '20px'
  },
  landingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  landingMessage: {
    maxWidth: 600
  },
  landingP: {
    marginBottom: 16
  },
  hide: {
    display: 'none'
  },
  browseButtonContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  browseButton: {
    marginBottom: 16,
    height: 72,
    flex: 1,
    maxWidth: 256,
    textAlign: 'center',
    fontSize: FontSize.BIG_BUTTON,
    lineHeight: '72px',
    background: Colors.DARK_BLUE,
    color: 'white',
    cursor: 'pointer'
  },
  link: {
    color: Colors.LIGHT_BLUE,
    cursor: 'pointer',
    textDecoration: 'none'
  },
  toolbar: {
    height: 18,
    background: 'black',
    color: 'white',
    textAlign: 'center',
    fontFamily: FontFamily.MONOSPACE,
    fontSize: FontSize.TITLE,
    lineHeight: '18px',
    userSelect: 'none'
  },
  toolbarLeft: {
    position: 'absolute',
    height: 18,
    overflow: 'hidden',
    top: 0,
    left: 0,
    marginRight: 2,
    textAlign: 'left',
  },
  toolbarRight: {
    height: 18,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    right: 0,
    marginRight: 2,
    textAlign: 'right',
  },
  toolbarTab: {
    background: Colors.DARK_GRAY,
    marginTop: 2,
    height: 16,
    lineHeight: '16px',
    paddingLeft: 2,
    paddingRight: 8,
    display: 'inline-block',
    marginLeft: 2,
    ':hover': {
      background: Colors.GRAY,
      cursor: 'pointer'
    }
  },
  toolbarTabActive: {
    background: Colors.LIGHT_BLUE,
    ':hover': {
      background: Colors.LIGHT_BLUE
    }
  },
  noLinkStyle: {
    textDecoration: 'none',
    color: 'inherit'
  },
  emoji: {
    display: 'inline-block',
    verticalAlign: 'middle',
    paddingTop: '0px',
    marginRight: '0.3em'
  }
})

