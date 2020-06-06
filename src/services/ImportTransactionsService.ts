import { getRepository, getCustomRepository } from 'typeorm';
import fs from 'fs';
import parse from 'csv-parse';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const categoryRepository = getRepository(Category);
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const readableFile = fs.createReadStream(filePath);
    const parser = parse({ trim: true, from_line: 2 });
    const parseCSV = readableFile.pipe(parser);

    const fileTransactions: Request[] = [];
    const fileCategories: string[] = [];

    parseCSV.on('data', transaction => {
      const [title, type, value, categoryName] = transaction;
      fileTransactions.push({
        title,
        type,
        value,
        category: categoryName,
      });
      if (!fileCategories.includes(categoryName)) {
        fileCategories.push(categoryName);
      }
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categories = await categoryRepository.find();

    const categoriesName = categories.map((item: Category) => {
      return item.title;
    });

    const categoriesToCreate = fileCategories.filter((item: string) => {
      return !categoriesName.includes(item);
    });

    const categoriesToSave = categoriesToCreate.map((title: string) => {
      return categoryRepository.create({ title });
    });

    const transactionsToSave = fileTransactions.map(
      ({ title, type, value, category }: Request) => {
        const allCategories = [...categories, ...categoriesToSave];
        const categoryItem = allCategories.find(
          (item: Category) => item.title === category,
        );
        return transactionsRepository.create({
          title,
          type,
          value,
          category_id: categoryItem?.id,
        });
      },
    );

    await categoryRepository.save(categoriesToSave);
    await transactionsRepository.save(transactionsToSave);

    return transactionsToSave;
  }
}

export default ImportTransactionsService;
