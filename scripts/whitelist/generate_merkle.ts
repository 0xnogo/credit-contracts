import dotenv from "dotenv";
import path from "path";
import { task } from "hardhat/config";
import { restore } from "firestore-export-import";
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });
import { admin, serviceAccount } from "../../lib/firebase";
import fs from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { ethers } from "ethers";

function csvToJson(text, headers?) {
    var lines=text.split("\n");

  var result = [];

  var headers=lines[0].split(",");

  for(var i=1;i<lines.length;i++){

      var obj = {};
      var currentline=lines[i].split(",");

      for(var j=0;j<headers.length;j++){
          obj[headers[j]] = currentline[j];
      }

      result.push(obj);

  }

  return result; 
}

const jsonToFirestore = async (fileName: string) => {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
    });
    console.log("Firebase Initialized");

    await restore(path.resolve(__dirname, `./outputs/${fileName}`));
    console.log("Upload Success");
  } catch (error) {
    console.log(error);
  }
};

const writeToFile = (array: any, filename: string) => {
  fs.writeFileSync(
    path.resolve(__dirname, `./outputs/${filename}`),
    JSON.stringify(array)
  );
};

export const createWl: () => void = () => { task("generate-merkle-tree", "")
  .addParam("epoch", "Epoch number (starts from 0)")
  .setAction(async ({ blocktimestamp, epoch }) => {
    const userFilePath = path.resolve(
      __dirname,
      `./inputs/epoch-${epoch}.csv`
    );
    const userData = csvToJson(fs.readFileSync(userFilePath).toString());

    console.log(userData)

    const leaves = userData.map((val) => [val.address]);

    const tree = StandardMerkleTree.of(leaves, ["address"]);

    const root = tree.root;

    console.log("root hash of the tree is :", root);

    let proofs: any = {};
    for (const [index, leaf] of tree.entries()) {
      const proof = tree.getProof(index);
      proofs[ethers.utils.getAddress(leaf[0] as string)] = {
        proof: proof,
      };
    }

    proofs["root"] = { proof: root };

    const fileName = `epoch-${epoch}.json`

    writeToFile(
      {
        [`whitelist-epoch-${epoch}`]:
          proofs,
      },
      fileName
    );

    await jsonToFirestore(fileName);

    console.log("Done");
})}