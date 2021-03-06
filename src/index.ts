import commandLineArgs from "command-line-args";
import fs from "fs";
import readline from "readline";
import searchDictionary from "./dictionary";

const filename = "data.json";

interface IOptionDefinition {
  name: string,
  alias?: string,
  type: any
};

interface IOptions {
  register?: string;
  delete?: string;
  dictionary: boolean;
  number?: number;
};

interface IVocabularyData {
  label: string;
  numCorrectAnswers: number;
  numIncorrectAnswers: number;
};

const optionDefinitions: IOptionDefinition[] = [
  { name: "register", alias: "r", type: String },
  { name: "delete", alias: "d", type: String },
  { name: "dict", type: Boolean },
  { name: "number", alias: "n", type: Number}
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
const randomize = <T>(arr: Array<T>) => {
  for(let i = arr.length - 1; i > 0; i--){
    const r = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[r];
    arr[r] = tmp;
  }
  return arr;
};
const MAXIMUM_FREQUENCY = 10;

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
      .filter(d => d.numCorrectAnswers < MAXIMUM_FREQUENCY)
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

const readDictionary =  (labels: string[]) => {
  return Promise.all(searchDictionary(labels)).then(results => {
    for (const [word, definition] of results) {
      console.log('\u001b[33m' + word + '\u001b[0m');
      console.log(definition);
    }
  });
};

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

const quizView = (options: IOptions) => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const dataset = VocaburaryDataset.fromBuffer(data);
    const promises = randomize(
      dataset.pick(options.number ? options.number : 10, defaultCompareFn)
    ).map(word =>
      () => 
        [word, q("Do you know the word \"" + word.label + "\"?[Y/n]: ")] as [IVocabularyData, Promise<string>]
    );
    (async () => {
      const incorrectAnswers: IVocabularyData[] = [];
      for (let p of promises) {
        const [word, _p] = p();
        const answer = await _p;
        if (answer === "" || answer === "y") {
          word.numCorrectAnswers += 1;
          fs.writeFileSync(filename, dataset.toJSON());
        } else if (answer === "n") {
          word.numIncorrectAnswers += 1;
          incorrectAnswers.push(word);
          fs.writeFileSync(filename, dataset.toJSON());
        } else {
          console.error('\u001b[31m' + "[ERROR] Invalid input. Skipping..." + '\u001b[0m');
        }
      }
      readDictionary(incorrectAnswers.map(w => w.label));
    })();
  });
};

const dictionaryView = (options: IOptions) => {
  fs.readFile(filename, (err, data) => {
    if (err) {
      initializeDatabase();
    }
    const dataset = VocaburaryDataset.fromBuffer(data);
    readDictionary(
      dataset
        .pick(options.number ? options.number : 10, defaultCompareFn)
        .map(w => w.label)
    );
  });
};

const main = () => {
  const options = commandLineArgs(optionDefinitions) as IOptions;
  if ('register' in options) {
    registerView(options);
  } else if ('delete' in options) {
    deleteView(options);
  } else if ('dict' in options) {
    dictionaryView(options);
  } else {
    quizView(options);
  }
};

main();
