import { EntityRepository, Repository, getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactionsRepository = getRepository(Transaction);
    const transactions = await transactionsRepository.find();

    const [income, outcome] = transactions.reduce(
      ([totalIncome, totalOutcome], transaction) => {
        const { type, value } = transaction;
        return [
          type === 'income' ? totalIncome + value : totalIncome,
          type === 'outcome' ? totalOutcome + value : totalOutcome,
        ];
      },
      [0, 0],
    );
    const total = income - outcome;
    return { income, outcome, total };
  }
}

export default TransactionsRepository;
