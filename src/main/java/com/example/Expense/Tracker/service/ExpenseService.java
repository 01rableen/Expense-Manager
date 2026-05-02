package com.example.Expense.Tracker.service;

import com.example.Expense.Tracker.model.Expense;
import com.example.Expense.Tracker.model.User;
import com.example.Expense.Tracker.repository.ExpenseRepository;
import com.example.Expense.Tracker.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ExpenseService {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private UserRepository userRepository;

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public List<Expense> getAll(String email) {
        return expenseRepository.findByUserEmail(email);
    }

    public Expense add(Expense expense, String email) {
        expense.setUser(getUser(email));
        return expenseRepository.save(expense);
    }

    public Expense update(Long id, Expense updated, String email) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Expense not found"));
        expense.setTitle(updated.getTitle());
        expense.setAmount(updated.getAmount());
        expense.setCategory(updated.getCategory());
        expense.setDate(updated.getDate());
        return expenseRepository.save(expense);
    }

    public void delete(Long id, String email) {
        expenseRepository.deleteById(id);
    }
}