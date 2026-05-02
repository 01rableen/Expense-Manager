package com.example.Expense.Tracker.controller;

import com.example.Expense.Tracker.dto.AuthRequest;
import com.example.Expense.Tracker.model.User;
import com.example.Expense.Tracker.repository.UserRepository;
import com.example.Expense.Tracker.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody AuthRequest request) {
        Map<String, String> response = new HashMap<>();

        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            response.put("error", "Email already registered!");
            return ResponseEntity.badRequest().body(response);
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);

        response.put("message", "Registered successfully!");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody AuthRequest request) {
        Map<String, String> response = new HashMap<>();

        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());

        if (userOpt.isEmpty() ||
                !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            response.put("error", "Invalid email or password!");
            return ResponseEntity.badRequest().body(response);
        }

        String token = jwtUtil.generateToken(request.getEmail());
        response.put("token", token);
        response.put("email", request.getEmail());
        return ResponseEntity.ok(response);
    }
}