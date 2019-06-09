import commandLineArgs from "command-line-args";
import fs from "fs";

const filename = "data.json";

interface IOptionDefinition {
  name: string,
  alias: string,
  type: any,
};
const optionDefinitions: IOptionDefinition[] = [
  { name: "register", alias: "r", type: String },
];

class Startup {
  public static main(): number {
    const options = commandLineArgs(optionDefinitions);
    if ('register' in options) {
      fs.readFile(filename, (err, data) => {
        if (err) {
          fs.writeFileSync(filename, JSON.stringify([]));
        }
        const json: string[] = data ? JSON.parse(data.toString()) : [];
        const word = options["register"];
        if (!json.includes(word)) json.push(word);
        fs.writeFileSync(filename, JSON.stringify(json));
      })

    }
    return 0;
  }
}

Startup.main();
