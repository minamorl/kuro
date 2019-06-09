import commandLineArgs from "command-line-args";
import fs from "fs";
import readline from "readline";

const filename = "data.json";


interface IOptionDefinition {
  name: string,
  alias: string,
  type: any
};

interface IRegisterAction {
  register: string;
};

const optionDefinitions: IOptionDefinition[] = [
  { name: "register", alias: "r", type: String }
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
const optimisticParse = (data: string) => data ? JSON.parse(data) as string[] : [];

const registerView = (options: IRegisterAction) => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const words = optimisticParse(data.toString());
    const word = options["register"];
    if (!words.includes(word)) words.push(word);
    fs.writeFileSync(filename, JSON.stringify(words));
  })
};

const quizView = () => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const words = optimisticParse(data.toString());
    const promises = words.map(word =>
      () => q("Do you know the word \"" + word + "\"?[y/n]: ")
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
  const options = commandLineArgs(optionDefinitions);
  if ('register' in options) {
    registerView(options as IRegisterAction);
  }
  if (Object.keys(options).length === 0) {
    quizView();
  }
};

main();
