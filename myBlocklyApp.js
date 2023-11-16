Blockly.Blocks['when_green_flag_clicked'] = {
  init: function() {
    this.appendDummyInput()
		
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Starts when the green flag is clicked");
    this.setHelpUrl("");
  }
};

// Define 'console_log' block
Blockly.Blocks['console_log'] = {
  init: function() {
    this.appendValueInput("TEXT")
        .setCheck("String")
        .appendField("console.log");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("Logs to console");
    this.setHelpUrl("");
  }
};

// Define 'alert' block
Blockly.Blocks['alert'] = {
  init: function() {
    this.appendValueInput("TEXT")
        .setCheck("String")
        .appendField("alert");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("Show an alert box");
    this.setHelpUrl("");
  }
};

// Define 'variable_set' block
Blockly.Blocks['variable_set'] = {
  init: function() {
    this.appendValueInput("VALUE")
        .setCheck(null)
        .appendField("set")
        .appendField(new Blockly.FieldVariable("item"), "VAR")
        .appendField("to");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(330);
    this.setTooltip("Set a variable");
    this.setHelpUrl("");
  }
};
Blockly.JavaScript['console_log'] = function(block) {
  var value_text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC);
  var code = 'console.log(' + value_text + ');\n';
  return code;
};

Blockly.JavaScript['alert'] = function(block) {
  var value_text = Blockly.JavaScript.valueToCode(block, 'TEXT', Blockly.JavaScript.ORDER_ATOMIC);
  var code = 'alert(' + value_text + ');\n';
  return code;
};

Blockly.JavaScript['variable_set'] = function(block) {
  var variable_var = Blockly.JavaScript.variableDB_.getName(block.getFieldValue('VAR'), Blockly.Variables.NAME_TYPE);
  var value_value = Blockly.JavaScript.valueToCode(block, 'VALUE', Blockly.JavaScript.ORDER_ASSIGNMENT) || '0';
  var code = variable_var + ' = ' + value_value + ';\n';
  return code;
};

// ... rest of your Blockly initialization code ...

// ... rest of your Blockly initialization code ...
// Define custom "Run" block
Blockly.Blocks['run'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Run");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip("Runs an action");
    this.setHelpUrl("");
  }
};

// Define custom "Run Hat" block
Blockly.Blocks['run_hat'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("Run Hat");
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Start of the sequence");
    this.setHelpUrl("");
  }
};

// Logic for the "Run" block
Blockly.JavaScript['run'] = function(block) {
  var code = 'console.log("Run block executed");\n';
  return code;
};

let workspace;

// Function to initialize Blockly with default theme and renderer
function initBlockly() {
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        renderer: "geras", // default renderer
        theme: Blockly.Themes.Classic // default theme
    });
}

// Function to change the theme of Blockly
function changeTheme(themeName) {
    let theme;
    switch (themeName) {
        case "classic":
            theme = Blockly.Themes.Classic;
            break;
        case "modern":
            theme = Blockly.Themes.Modern;
            break;
        case "dark":
            theme = Blockly.Themes.Dark;
            break;
        case "zelos":
            theme = Blockly.Themes.Zelos;
            break;
        // Add more themes as needed
    }
    workspace.updateOptions({theme: theme});
}

// Function to change the renderer of Blockly
function changeRenderer(rendererName) {
    // Dispose the old workspace
    workspace.dispose();

    // Reinitialize with the new renderer
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        renderer: rendererName,
        theme: workspace.options.theme // Keep the current theme
    });
}

// Initial setup of Blockly
initBlockly();
