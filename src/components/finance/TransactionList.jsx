import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Calendar, Edit, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TransactionList({ transactions, onEdit, onDelete }) {
  const handleDelete = (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      onDelete(id);
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">거래 내역</h2>
      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">거래 내역이 없습니다</p>
        ) : (
          sortedTransactions.map((transaction, index) => (
            <motion.div
              key={transaction.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-4 flex-1">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {transaction.type === 'income' ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{transaction.category}</p>
                  <p className="text-sm text-gray-600">{transaction.description}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1 space-x-3">
                    <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" />{transaction.transaction_date}</span>
                    {transaction.customers && <span className="flex items-center"><User className="w-3 h-3 mr-1" />{transaction.customers.name}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}₩{Number(transaction.amount).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                {transaction.type === 'expense' && (
                   <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)}>
                     <Edit className="w-4 h-4" />
                   </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(transaction.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}