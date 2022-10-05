// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  [key: string]: unknown;
};

const hello = (req: NextApiRequest, res: NextApiResponse<Data>) => {
  try {
    const name = req.query.name as string;
    res.status(200).json({ upperCaseName: name.toUpperCase() });
  } catch {
    res.status(500).json({
      error: "failed to run operation, make sure to supply name as string",
    });
  }
};

export default hello;
