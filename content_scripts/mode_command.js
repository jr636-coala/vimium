class CommandMode extends Mode {
  constructor(options) {
    super();

    options ??= {};

    CommandMode.query = { rawQuery: "" };

    super.init(Object.assign(options, {
      name: "command",
      indicator: false,
      exitOnClick: true,
      exitOnEscape: true,
      suppressAllKeyboardEvents: true,
    }));

    HUD.showCommandMode(this);
  }

  exit(event) {
    HUD.unfocusIfFocused();
    super.exit();
    if (event) CommandMode.handleEscape();
  }

  // Returns null if no search has been performed yet.
  static getQuery(backwards) {
    if (!this.query) return;
    // check if the query has been changed by a script in another frame
    const mostRecentQuery = CommandModeHistory.getQuery();
    if (mostRecentQuery !== this.query.rawQuery) {
      this.updateQuery(mostRecentQuery);
    }

    return this.getNextQueryFromRegexMatches(backwards);
  }

  static runQuery() {
    const q = this.query.rawQuery.trim();
    CommandModeHistory.saveQuery(q);
    const bits = q.split(' ');
    switch (bits[0]) {
      case 'map': return map();
      case 'unmap': CommandSet.remove(bits[1]); return CommandSet.save();
      case '.': return alert(Object.entries(CommandSet.rawList).join('\n'));
    }
    const [args, body] = CommandSet.get(bits[0]);
    const func = `(async (${args}) => { ${body} })(${bits.slice(1)})`;
    //const func = new Function(...args.filter(x => x), body);
    //return func(...bits.slice(1));
    setTimeout(func, 0);
    function map() {
      let [, name, ...str] = q.split(' ');
      str = str.join(' ');
      let [args, ...body] = str.split('|');
      body = body.flat().join('|');
      args = args.trim().split(' ').filter(x => x);
      CommandSet.set(name, [args, body]);
      CommandSet.save();
    }
  }

  static execute() {}

  static handleEscape() {
    document.body.classList.remove("vimiumCommandMode");
  }

  static handleEnter() {
    document.body.classList.add("vimiumCommandMode");
    return CommandMode.runQuery();
  }
}

window.CommandMode = CommandMode;
CommandSet.init();
