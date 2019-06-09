import commandLineArgs from "command-line-args";
import fs from "fs";
import readline from "readline";

const filename = "data.json";

interface IOptionDefinition {
  name: string,
  alias: string,
  type: any
};

interface IOptions {
  register?: string;
  delete?: string;
};

interface IVocabularyData {
  label: string;
  numCorrectAnswers: number;
  numIncorrectAnswers: number;
};

const optionDefinitions: IOptionDefinition[] = [
  { name: "register", alias: "r", type: String },
  { name: "delete", alias: "d", type: String }
];

const q = (msg: string) => new Promise(resolve => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question(msg, answer => {
    rl.close();
    resolve(answer);
  });
});

const initializeDatabase = () => fs.writeFileSync(filename, JSON.stringify([]));
const optimisticParse = (data?: Buffer) =>
  data? JSON.parse(data.toString()) as IVocabularyData[] : [];

const registerView = (options: IOptions) => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const words = optimisticParse(data);
    const word = options["register"]!;
    if (words.findIndex(w => w.label === word)) {
      words.push({
        label: word,
        numCorrectAnswers: 0,
        numIncorrectAnswers: 0
      });
    }
    fs.writeFileSync(filename, JSON.stringify(words));
  })
};

const deleteView = (options: IOptions) => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const words = optimisticParse(data);
    const word = options["delete"]!;
    const index = words.findIndex(w => w.label === word);
    if (index >= 0) words.splice(index, 1);
    fs.writeFileSync(filename, JSON.stringify(words));
  })
};

const quizView = () => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const words = optimisticParse(data);
    const promises = words.map(word =>
      () => q("Do you know the word \"" + word.label + "\"?[y/n]: ")
    );
    (async () => {
      for (let p of promises) {
        let answer = await p();
        if (answer === "" || answer === "y" || answer === "n") {
          // TODO: save the status
        } else {
          console.error("[ERROR] Invalid input. Skipping...");
        }
      }
    })();
  });
};

const main = () => {
  const options = commandLineArgs(optionDefinitions) as IOptions;
  if ('register' in options) {
    registerView(options);
  }
  if ('delete' in options) {
    deleteView(options);
  }
  if (Object.keys(options).length === 0) {
    quizView();
  }
};

main();
