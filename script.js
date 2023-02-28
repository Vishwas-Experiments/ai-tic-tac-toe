Array.prototype.eq = function(arr) {
  return this.length === arr.length && this.every((v, i) => v == arr[i])
}

Array.prototype.transpose = function() {
  return this.reduce((prev, next) => next.map((item, i) =>
    (prev[i] || []).concat(next[i])
    ), [])
}

const initial = [[0, 0, 0]
                ,[0, 0, 0]
                ,[0, 0, 0]]

const format = x => {
  if (x == 0)  return '-'
  if (x == 1)  return 'X'
  if (x == -1) return 'O'
}

class Node {
  board
  a
  b
  children
  utility
  prompt
  player

  constructor(board, a, b, children, prompt, player) {
    this.board    = board
    this.a        = a
    this.b        = b
    this.children = children
    this.prompt   = prompt
    this.player   = player
  }
}

// Generator-based approach because JS can't handle deep recursion
const genTree = function*(board, value) {
  if (utility(board)) return
  for (let i = 0; i < 3; ++i) {
    for (let j = 0; j < 3; ++j) {
      if (board[i][j]) continue
      let next = board.map(r => [...r])
      next[i][j] = value
      yield new Node(next, -Infinity, Infinity, genTree(next, value * -1), [i, j], value)
    }
  }
}

// Call minimax on the board with alpha=-inf, beta=inf
const computeMove = board =>  minimax(new Node(board, -Infinity, Infinity, genTree(board, 1), [-1, -1], 1), 1)

const minimax = (node, value) => {
  const visitedChildren = []
  for (const child of node.children) {
    child.a = node.a
    child.b = node.b
    const n = minimax(child, value * -1)
    const v = n.utility
    visitedChildren.push(n)
    if (value === 1) {
      // max layer
      node.a = Math.max(node.a, v)
    } else {
      node.b = Math.min(node.b, v)
    }

      // Prune if a >= b
      if (node.a >= node.b) {
        node.children = visitedChildren
        if (value === 1)
          node.utility = node.a
        else
          node.utility = node.b
        return node
      }
  }

  node.children = visitedChildren
  if (visitedChildren.eq([])) {
    node.utility = utility(node.board)
  } else {
    node.utility = value === 1 ? node.a : node.b
  }
  return node
}

// Utility for AI (1 = win, 0 = draw, -1 = loss)
// Negate domain for player
const utility = board => {
  const anyRows      = (b, v) => b.some(r => r.every(c => c == v))
  const anyColumns   = (b, v) => anyRows(b.transpose(), v)
  const anyDiagonals = (b, v) => anyRows([b.map((r, i) => r[i]), b.map((r, i) => r[2 - i])], v)

  if (anyRows(board, 1) || anyColumns(board, 1) || anyDiagonals(board, 1))
    return 1
  else if (anyRows(board, -1) || anyColumns(board, -1) || anyDiagonals(board, -1))
    return -1
  return 0
}

const formatUtility = utility => {
  if (utility === 1)  return "AI wins"
  if (utility === -1) return "You win"
  if (utility === 0)  return "Draw"
}

// Only UI and rendering stuff below
const checkGameOver = board => {
  const result = utility(board)
  if (result) {
    alert(result === 1 ? "The AI won!" : "You won!")
    document.location.reload()
  }

  if (!board.some(r => r.indexOf(0) > -1)) {
    alert("Game ended in a draw")
    document.location.reload()
  }
}

const App = () => {
  const [turn, setTurn] = React.useState("player") // can be ai, player, or null
  const [board, setBoard] = React.useState(initial)
  const [proposed, setProposed] = React.useState([-1, -1])
  const [gameTree, setGameTree] = React.useState({board: initial, children: [], prompt: [-1, -1]})

  const handleProposal = ([i, j]) => {
    setProposed([i, j])
    const newBoard = board.map(r => [...r])
    newBoard[i][j] = -1
    setGameTree(computeMove(newBoard))
  }

  const handleCommit = () => {
    const newBoard = board.map(r => [...r])
    const [i, j] = proposed
    newBoard[i][j] = -1
    checkGameOver(newBoard)
    const moves = computeMove(newBoard)
    // Pick a W
    let move = moves.children.find(n => n.utility === 1)
    // If none, settle for a draw
    if (!move) move = moves.children.find(n => n.utility === 0)
    setTurn("ai")
    setBoard(move.board)
    setProposed(move.prompt)
    setTimeout(() => {
      checkGameOver(move.board)
      setTurn("player")
      setProposed([-1, -1])
    }, 1000)
  }

  return (
          <main>
            <section id="arena">
              <h3>How to play</h3>
              <ol>
                <li>Click on a box to propose a move</li>
                <li>Peek the AI's next move</li>
                <li>Commit your move once happy with it</li>
                <li>Watch the AI make its move and proceed to your next</li>
              </ol>
              <h3>{turn == "ai" ? "Computer's turn (X)" : "Your turn (O)"}</h3>
              <Board
                state={board}
                onProposeMove={handleProposal}
                proposed={proposed}
                proposer={turn == "ai" ? 1 : -1}
              />
              <button id="commit" onClick={handleCommit} disabled={proposed.eq([-1,-1])}>Commit move</button>
            </section>
            <section id="inspector">
              <h3>Decision tree visualiser</h3>
              {proposed.eq([-1, -1]) && <p>Make a move for the AI to react</p>}
              {!proposed.eq([-1, -1]) && <Inspector node={gameTree} />}
            </section>
          </main>
  )
}

const Inspector = props => {
  const [open, setOpen] = React.useState(false)
  return (
          <div className="inspector__node">
            <Board
              disabled
              small
              state={props.node.board}
              proposed={props.node.prompt}
              proposer={props.node.player}
            />
            <br/>
            {formatUtility(props.node.utility)}
            {!props.node.children.eq([]) && <button onClick={() => setOpen(!open)}>{open ? "Collapse" : "Expand"}</button>}
            {open && <div className="inspector__children">{props.node.children.map(n=><Inspector node={n} />)}</div>}
          </div>
  )
}

const Board = props =>
  <div className={`board ${props.small && 'board--small'}`}>
    {props.state.map((r, i) =>
        r.map((c, j) =>
          <button
            disabled={props.disabled || c}
            onClick={props.onProposeMove && props.onProposeMove.bind(null, [i, j])}
            className={props.proposed.eq([i, j]) ? "proposed" : ""}
            key={[i, j]}>
            {format(props.proposed.eq([i, j]) ? props.proposer : c)}
          </button>
          ))}
  </div>

const domContainer = document.querySelector('#root')
const root = ReactDOM.createRoot(domContainer)
root.render(<App/>)