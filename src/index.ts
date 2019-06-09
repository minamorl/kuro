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

const q = (msg: string) => new Promise<string>(resolve => {
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

const MAXIMUM_FREQUENCY = 50;

type CompareFunction = (a: IVocabularyData, b: IVocabularyData) => number;
const defaultCompareFn: CompareFunction = (a, b) => {
  const totalNumA = a.numCorrectAnswers + a.numIncorrectAnswers;
  const totalNumB = b.numCorrectAnswers + b.numIncorrectAnswers;
  
  if (totalNumA === 0 || totalNumB === 0) {
    if (totalNumA > totalNumB) {
      return 1;
    } else if (totalNumA < totalNumB) {
      return -1;
    } else {
      return 0;
    }
  }
  
  const rateA = a.numCorrectAnswers / totalNumA;
  const rateB = b.numCorrectAnswers / totalNumB;
  if (rateA > rateB) {
    return 1;
  } else if (rateA < rateB) {
    return -1;
  } else {
    return 0;
  }
}
class VocaburaryDataset {
  dataset: IVocabularyData[] = []
  constructor(dataset: IVocabularyData[]) {
    this.dataset = dataset;
  }
  pick(n: number, compareFn?: CompareFunction) {
    if (compareFn) {
      this.dataset.sort(compareFn);
    }
    return this.dataset
      .filter(d => d.numCorrectAnswers + d.numIncorrectAnswers < MAXIMUM_FREQUENCY)
      .slice(0, n);
  }
  insertOrUpdate(w: IVocabularyData) {
    const index = this.dataset.findIndex(x => x.label === w.label);
    if (index > -1) {
      this.dataset[index] = w;
    } else {
      this.dataset.push(w);
    }
  }
  remove(label: string) {
    const index = this.dataset.findIndex(w => w.label === label);
    if (index >= 0) this.dataset.splice(index, 1);
  }
  toJSON() {
    return JSON.stringify(this.dataset);
  }
  static fromBuffer(buf: Buffer) {
    return new VocaburaryDataset(optimisticParse(buf));
  }
}

const registerView = (options: IOptions) => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const dataset = VocaburaryDataset.fromBuffer(data);
    const word = options["register"]!;
    dataset.insertOrUpdate({
      label: word,
      numCorrectAnswers: 0,
      numIncorrectAnswers: 0
    });
    fs.writeFileSync(filename, dataset.toJSON());
  })
};

const deleteView = (options: IOptions) => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const dataset = VocaburaryDataset.fromBuffer(data);
    const label = options["delete"]!;
    dataset.remove(label);
    fs.writeFileSync(filename, dataset.toJSON());
  })
};

const quizView = () => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const dataset = VocaburaryDataset.fromBuffer(data);
    const promises = dataset.pick(10, defaultCompareFn).map(word =>
      () => 
        [word, q("Do you know the word \"" + word.label + "\"?[y/n]: ")] as [IVocabularyData, Promise<string>]
    );
    (async () => {
      for (let p of promises) {
        const [word, _p] = p();
        const answer = await _p;
        if (answer === "" || answer === "y") {
          word.numCorrectAnswers += 1;
          fs.writeFileSync(filename, dataset.toJSON());
        } else if (answer === "n") {
          word.numIncorrectAnswers += 1;
          fs.writeFileSync(filename, dataset.toJSON());
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
